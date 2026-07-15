#define _DARWIN_C_SOURCE 1

#include <CommonCrypto/CommonDigest.h>
#include <CoreServices/CoreServices.h>
#include <dispatch/dispatch.h>

#include <errno.h>
#include <fcntl.h>
#include <limits.h>
#include <poll.h>
#include <pthread.h>
#include <stdbool.h>
#include <stdint.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <sys/socket.h>
#include <sys/stat.h>
#include <sys/types.h>
#include <time.h>
#include <unistd.h>

#define ROOTS_CONFIG_NAME "roots.config"
#define COMMAND_NAME "command.bin"
#define ACK_NAME "ack.bin"
#define ACK_COMMIT_NAME "ack.commit"
#define JOURNAL_NAME "journal.bin"

#define COMMAND_BYTES 20U
#define ACK_BYTES 136U
#define ACK_COMMIT_BYTES 72U
#define JOURNAL_HEADER_BYTES 40U
#define SHA256_READ_CHUNK_BYTES (64U * 1024U)
#define MAX_CONFIG_BYTES (16U * 1024U * 1024U)
#define MAX_JOURNAL_BYTES (UINT64_C(512) * 1024U * 1024U)
#define MAX_JOURNAL_ENTRIES UINT64_C(1000000)
#define MAX_EVENT_PATH_BYTES (1024U * 1024U)

#define COMMAND_FLUSH 1U
#define COMMAND_STOP 2U
#define COMMAND_SEAL 3U

#define ACK_READY 1U
#define ACK_FLUSH 2U
#define ACK_STOP 3U
#define ACK_SEAL 4U

#define JOURNAL_EVENT 1U

typedef struct {
  int scratch_fd;
  int journal_fd;
  pthread_mutex_t mutex;
  uint64_t journal_offset;
  uint64_t entry_count;
  uint64_t last_event_id;
  CC_SHA256_CTX expected_digest;
  bool accepting_events;
  bool failed;
} journal_state;

typedef struct {
  uint64_t journal_high_water;
  uint64_t entry_count;
  uint64_t last_event_id;
  uint64_t journal_device;
  uint64_t journal_inode;
  uint8_t journal_digest[CC_SHA256_DIGEST_LENGTH];
} journal_endpoint;

typedef struct {
  uint64_t count;
  uint8_t digest[CC_SHA256_DIGEST_LENGTH];
} roots_attestation;

typedef struct {
  dev_t device;
  ino_t inode;
} file_identity;

static void put_u16_le(uint8_t *target, uint16_t value) {
  target[0] = (uint8_t)(value & 0xffU);
  target[1] = (uint8_t)((value >> 8U) & 0xffU);
}

static void put_u32_le(uint8_t *target, uint32_t value) {
  target[0] = (uint8_t)(value & 0xffU);
  target[1] = (uint8_t)((value >> 8U) & 0xffU);
  target[2] = (uint8_t)((value >> 16U) & 0xffU);
  target[3] = (uint8_t)((value >> 24U) & 0xffU);
}

static void put_u64_le(uint8_t *target, uint64_t value) {
  for (unsigned int index = 0U; index < 8U; index += 1U) {
    target[index] = (uint8_t)((value >> (index * 8U)) & 0xffU);
  }
}

static uint16_t get_u16_le(const uint8_t *source) {
  return (uint16_t)((uint16_t)source[0] | ((uint16_t)source[1] << 8U));
}

static uint32_t get_u32_le(const uint8_t *source) {
  return (uint32_t)source[0]
    | ((uint32_t)source[1] << 8U)
    | ((uint32_t)source[2] << 16U)
    | ((uint32_t)source[3] << 24U);
}

static uint64_t get_u64_le(const uint8_t *source) {
  uint64_t value = 0U;
  for (unsigned int index = 0U; index < 8U; index += 1U) {
    value |= ((uint64_t)source[index]) << (index * 8U);
  }
  return value;
}

static int fsync_retry(int descriptor) {
  int result;
  do {
    result = fsync(descriptor);
  } while (result < 0 && errno == EINTR);
  return result;
}

static int pread_exact(int descriptor, uint8_t *buffer, size_t length, off_t offset) {
  size_t consumed = 0U;
  while (consumed < length) {
    ssize_t amount = pread(descriptor, buffer + consumed, length - consumed, offset + (off_t)consumed);
    if (amount < 0 && errno == EINTR) continue;
    if (amount <= 0) return -1;
    consumed += (size_t)amount;
  }
  return 0;
}

static int pwrite_exact(int descriptor, const uint8_t *buffer, size_t length, off_t offset) {
  size_t consumed = 0U;
  while (consumed < length) {
    ssize_t amount = pwrite(descriptor, buffer + consumed, length - consumed, offset + (off_t)consumed);
    if (amount < 0 && errno == EINTR) continue;
    if (amount <= 0) return -1;
    consumed += (size_t)amount;
  }
  return 0;
}

static int sha256_update_bytes(CC_SHA256_CTX *context, const uint8_t *bytes, size_t length) {
  size_t consumed = 0U;
  while (consumed < length) {
    size_t remaining = length - consumed;
    CC_LONG chunk = remaining > (size_t)UINT32_MAX
      ? (CC_LONG)UINT32_MAX
      : (CC_LONG)remaining;
    if (CC_SHA256_Update(context, bytes + consumed, chunk) != 1) return -1;
    consumed += (size_t)chunk;
  }
  return 0;
}

static int sha256_file_prefix(
  int descriptor,
  uint64_t length,
  uint8_t digest[CC_SHA256_DIGEST_LENGTH]
) {
  CC_SHA256_CTX context;
  if (CC_SHA256_Init(&context) != 1) return -1;
  uint8_t buffer[SHA256_READ_CHUNK_BYTES];
  uint64_t offset = 0U;
  while (offset < length) {
    uint64_t remaining = length - offset;
    size_t chunk = remaining > (uint64_t)sizeof(buffer)
      ? sizeof(buffer)
      : (size_t)remaining;
    if (pread_exact(descriptor, buffer, chunk, (off_t)offset) < 0
      || sha256_update_bytes(&context, buffer, chunk) < 0) {
      return -1;
    }
    offset += (uint64_t)chunk;
  }
  return CC_SHA256_Final(digest, &context) == 1 ? 0 : -1;
}

static int sha256_context_digest(
  const CC_SHA256_CTX *context,
  uint8_t digest[CC_SHA256_DIGEST_LENGTH]
) {
  CC_SHA256_CTX copy = *context;
  return CC_SHA256_Final(digest, &copy) == 1 ? 0 : -1;
}

static int sha256_bytes(
  const uint8_t *bytes,
  size_t length,
  uint8_t digest[CC_SHA256_DIGEST_LENGTH]
) {
  CC_SHA256_CTX context;
  if (CC_SHA256_Init(&context) != 1
    || sha256_update_bytes(&context, bytes, length) < 0) {
    return -1;
  }
  return CC_SHA256_Final(digest, &context) == 1 ? 0 : -1;
}

static bool secure_regular_stat(const struct stat *status, mode_t expected_mode) {
  return S_ISREG(status->st_mode)
    && (status->st_mode & 07777U) == expected_mode
    && status->st_uid == geteuid()
    && status->st_nlink == 1;
}

static bool secure_directory_stat(const struct stat *status) {
  return S_ISDIR(status->st_mode)
    && (status->st_mode & 07777U) == 0700U
    && status->st_uid == geteuid();
}

static bool same_file_snapshot(const struct stat *left, const struct stat *right) {
  return left->st_dev == right->st_dev
    && left->st_ino == right->st_ino
    && left->st_mode == right->st_mode
    && left->st_uid == right->st_uid
    && left->st_nlink == right->st_nlink
    && left->st_size == right->st_size
    && left->st_mtimespec.tv_sec == right->st_mtimespec.tv_sec
    && left->st_mtimespec.tv_nsec == right->st_mtimespec.tv_nsec
    && left->st_ctimespec.tv_sec == right->st_ctimespec.tv_sec
    && left->st_ctimespec.tv_nsec == right->st_ctimespec.tv_nsec;
}

static bool same_file_identity(const file_identity *identity, const struct stat *status) {
  return identity->device == status->st_dev && identity->inode == status->st_ino;
}

static int validate_parent_channel(void) {
  struct stat status;
  int flags = fcntl(STDIN_FILENO, F_GETFL);
  if (fstat(STDIN_FILENO, &status) < 0 || flags < 0) return -1;
  int access_mode = flags & O_ACCMODE;
  if (S_ISFIFO(status.st_mode)) return access_mode == O_RDONLY ? 0 : -1;
  if (!S_ISSOCK(status.st_mode) || access_mode == O_WRONLY) return -1;
  int socket_type = 0;
  socklen_t socket_type_length = sizeof(socket_type);
  struct sockaddr_storage peer;
  socklen_t peer_length = sizeof(peer);
  if (getsockopt(
      STDIN_FILENO,
      SOL_SOCKET,
      SO_TYPE,
      &socket_type,
      &socket_type_length
    ) < 0
    || socket_type != SOCK_STREAM
    || getpeername(STDIN_FILENO, (struct sockaddr *)&peer, &peer_length) < 0) {
    return -1;
  }
  return 0;
}

static int poll_parent_channel(int timeout_milliseconds) {
  struct pollfd parent = {
    .fd = STDIN_FILENO,
    .events = POLLIN,
    .revents = 0
  };
  int status;
  do {
    status = poll(&parent, 1U, timeout_milliseconds);
  } while (status < 0 && errno == EINTR);
  if (status < 0) return -1;
  if (status == 0) return 0;
  if ((parent.revents & (POLLHUP | POLLERR | POLLNVAL)) != 0) return -1;
  if ((parent.revents & POLLIN) != 0) {
    uint8_t unexpected;
    ssize_t amount;
    do {
      amount = read(STDIN_FILENO, &unexpected, 1U);
    } while (amount < 0 && errno == EINTR);
    return -1;
  }
  return -1;
}

static int validate_open_file_at(int directory_fd, const char *name, int descriptor, mode_t expected_mode) {
  struct stat opened;
  struct stat visible;
  if (fstat(descriptor, &opened) < 0
    || fstatat(directory_fd, name, &visible, AT_SYMLINK_NOFOLLOW) < 0
    || !secure_regular_stat(&opened, expected_mode)
    || !secure_regular_stat(&visible, expected_mode)
    || opened.st_dev != visible.st_dev
    || opened.st_ino != visible.st_ino) {
    return -1;
  }
  return 0;
}

static int open_existing_secure(int directory_fd, const char *name, int flags) {
  struct stat visible;
  if (fstatat(directory_fd, name, &visible, AT_SYMLINK_NOFOLLOW) < 0
    || !secure_regular_stat(&visible, 0600U)) {
    return -1;
  }
  int descriptor = openat(directory_fd, name, flags | O_CLOEXEC | O_NOFOLLOW | O_NONBLOCK);
  if (descriptor < 0) return -1;
  if (validate_open_file_at(directory_fd, name, descriptor, 0600U) < 0) {
    close(descriptor);
    return -1;
  }
  return descriptor;
}

static int create_secure_output(int directory_fd, const char *name) {
  struct stat visible;
  if (fstatat(directory_fd, name, &visible, AT_SYMLINK_NOFOLLOW) == 0 || errno != ENOENT) {
    return -1;
  }
  int descriptor = openat(
    directory_fd,
    name,
    O_RDWR | O_CREAT | O_EXCL | O_CLOEXEC | O_NOFOLLOW,
    0600U
  );
  if (descriptor < 0) return -1;
  if (fchmod(descriptor, 0600U) < 0
    || validate_open_file_at(directory_fd, name, descriptor, 0600U) < 0) {
    close(descriptor);
    return -1;
  }
  return descriptor;
}

static int open_scratch(const char *scratch_path) {
  struct stat visible;
  if (lstat(scratch_path, &visible) < 0
    || S_ISLNK(visible.st_mode)
    || !secure_directory_stat(&visible)) {
    return -1;
  }
  int descriptor = open(scratch_path, O_RDONLY | O_DIRECTORY | O_CLOEXEC | O_NOFOLLOW);
  if (descriptor < 0) return -1;
  struct stat opened;
  if (fstat(descriptor, &opened) < 0
    || !secure_directory_stat(&opened)
    || opened.st_dev != visible.st_dev
    || opened.st_ino != visible.st_ino) {
    close(descriptor);
    return -1;
  }
  return descriptor;
}

static CFArrayRef read_roots_config(
  int scratch_fd,
  int config_fd,
  roots_attestation *attestation
) {
  if (validate_open_file_at(scratch_fd, ROOTS_CONFIG_NAME, config_fd, 0600U) < 0) return NULL;
  struct stat before;
  if (fstat(config_fd, &before) < 0
    || before.st_size < 2
    || (uint64_t)before.st_size > (uint64_t)MAX_CONFIG_BYTES) {
    return NULL;
  }
  size_t length = (size_t)before.st_size;
  uint8_t *buffer = malloc(length);
  if (buffer == NULL) return NULL;
  if (pread_exact(config_fd, buffer, length, 0) < 0 || buffer[length - 1U] != 0U) {
    free(buffer);
    return NULL;
  }

  CFMutableArrayRef roots = CFArrayCreateMutable(NULL, 0, &kCFTypeArrayCallBacks);
  if (roots == NULL) {
    free(buffer);
    return NULL;
  }
  size_t start = 0U;
  bool valid = true;
  while (start < length) {
    size_t end = start;
    while (end < length && buffer[end] != 0U) end += 1U;
    size_t path_length = end - start;
    if (end >= length || path_length == 0U || buffer[start] != (uint8_t)'/') {
      valid = false;
      break;
    }
    char *root_path = malloc(path_length + 1U);
    if (root_path == NULL) {
      valid = false;
      break;
    }
    memcpy(root_path, buffer + start, path_length);
    root_path[path_length] = '\0';
    struct stat root_status;
    if (lstat(root_path, &root_status) < 0
      || !S_ISDIR(root_status.st_mode)
      || S_ISLNK(root_status.st_mode)) {
      free(root_path);
      valid = false;
      break;
    }
    CFStringRef root = CFStringCreateWithBytes(
      NULL,
      buffer + start,
      (CFIndex)path_length,
      kCFStringEncodingUTF8,
      false
    );
    free(root_path);
    if (root == NULL) {
      valid = false;
      break;
    }
    CFArrayAppendValue(roots, root);
    CFRelease(root);
    start = end + 1U;
  }

  struct stat after;
  if (fstat(config_fd, &after) < 0
    || validate_open_file_at(scratch_fd, ROOTS_CONFIG_NAME, config_fd, 0600U) < 0
    || before.st_dev != after.st_dev
    || before.st_ino != after.st_ino
    || before.st_size != after.st_size
    || before.st_mtimespec.tv_sec != after.st_mtimespec.tv_sec
    || before.st_mtimespec.tv_nsec != after.st_mtimespec.tv_nsec
    || before.st_ctimespec.tv_sec != after.st_ctimespec.tv_sec
    || before.st_ctimespec.tv_nsec != after.st_ctimespec.tv_nsec) {
    valid = false;
  }
  CFIndex root_count = CFArrayGetCount(roots);
  if (!valid || root_count <= 0
    || sha256_bytes(buffer, length, attestation->digest) < 0) {
    free(buffer);
    CFRelease(roots);
    return NULL;
  }
  attestation->count = (uint64_t)root_count;
  free(buffer);
  return roots;
}

static void set_journal_failure(journal_state *state) {
  state->failed = true;
}

static void append_events(
  ConstFSEventStreamRef stream,
  void *context,
  size_t event_count,
  void *event_paths,
  const FSEventStreamEventFlags event_flags[],
  const FSEventStreamEventId event_ids[]
) {
  (void)stream;
  journal_state *state = context;
  char **paths = event_paths;
  int lock_result = pthread_mutex_lock(&state->mutex);
  if (lock_result != 0) _exit(70);
  if (!state->accepting_events || state->failed) {
    pthread_mutex_unlock(&state->mutex);
    return;
  }

  for (size_t index = 0U; index < event_count; index += 1U) {
    if (paths == NULL || paths[index] == NULL) {
      set_journal_failure(state);
      break;
    }
    size_t path_length = strnlen(paths[index], MAX_EVENT_PATH_BYTES + 1U);
    if (path_length == 0U || path_length > MAX_EVENT_PATH_BYTES
      || path_length > (size_t)UINT32_MAX - JOURNAL_HEADER_BYTES) {
      set_journal_failure(state);
      break;
    }
    uint32_t record_length = (uint32_t)(JOURNAL_HEADER_BYTES + path_length);
    if ((uint64_t)record_length > MAX_JOURNAL_BYTES
      || state->journal_offset > UINT64_MAX - (uint64_t)record_length
      || state->journal_offset > (uint64_t)INT64_MAX - (uint64_t)record_length
      || state->entry_count == UINT64_MAX
      || state->entry_count >= MAX_JOURNAL_ENTRIES
      || state->journal_offset > MAX_JOURNAL_BYTES - (uint64_t)record_length) {
      set_journal_failure(state);
      break;
    }
    uint64_t sequence = state->entry_count + 1U;
    uint8_t header[JOURNAL_HEADER_BYTES] = {0};
    memcpy(header, "MFSJ", 4U);
    put_u16_le(header + 4U, 1U);
    put_u16_le(header + 6U, JOURNAL_EVENT);
    put_u32_le(header + 8U, record_length);
    put_u64_le(header + 12U, sequence);
    put_u64_le(header + 20U, (uint64_t)event_ids[index]);
    put_u32_le(header + 28U, (uint32_t)event_flags[index]);
    put_u32_le(header + 32U, (uint32_t)path_length);
    put_u32_le(header + 36U, 0U);
    off_t record_offset = (off_t)state->journal_offset;
    CC_SHA256_CTX expected_after_append = state->expected_digest;
    if (pwrite_exact(state->journal_fd, header, sizeof(header), record_offset) < 0
      || pwrite_exact(
        state->journal_fd,
        (const uint8_t *)paths[index],
        path_length,
        record_offset + (off_t)JOURNAL_HEADER_BYTES
      ) < 0
      || sha256_update_bytes(&expected_after_append, header, sizeof(header)) < 0
      || sha256_update_bytes(
        &expected_after_append,
        (const uint8_t *)paths[index],
        path_length
      ) < 0) {
      set_journal_failure(state);
      break;
    }
    state->expected_digest = expected_after_append;
    state->journal_offset += (uint64_t)record_length;
    state->entry_count = sequence;
    state->last_event_id = (uint64_t)event_ids[index];
  }
  pthread_mutex_unlock(&state->mutex);
}

static void callback_queue_barrier(void *context) {
  (void)context;
}

static int validate_journal_endpoint_file(journal_state *state) {
  struct stat opened;
  struct stat visible;
  if (fstat(state->journal_fd, &opened) < 0
    || fstatat(state->scratch_fd, JOURNAL_NAME, &visible, AT_SYMLINK_NOFOLLOW) < 0
    || !secure_regular_stat(&opened, 0600U)
    || !secure_regular_stat(&visible, 0600U)
    || opened.st_dev != visible.st_dev
    || opened.st_ino != visible.st_ino
    || opened.st_size < 0
    || visible.st_size < 0
    || (uint64_t)opened.st_size != state->journal_offset
    || (uint64_t)visible.st_size != state->journal_offset) {
    return -1;
  }
  return 0;
}

static int validate_journal_endpoint_digest(
  journal_state *state,
  journal_endpoint *endpoint
) {
  uint8_t actual[CC_SHA256_DIGEST_LENGTH];
  uint8_t expected[CC_SHA256_DIGEST_LENGTH];
  struct stat opened;
  if (validate_journal_endpoint_file(state) < 0
    || sha256_file_prefix(state->journal_fd, state->journal_offset, actual) < 0
    || validate_journal_endpoint_file(state) < 0
    || fstat(state->journal_fd, &opened) < 0
    || !secure_regular_stat(&opened, 0600U)
    || opened.st_size < 0
    || (uint64_t)opened.st_size != state->journal_offset
    || sha256_context_digest(&state->expected_digest, expected) < 0) {
    return -1;
  }
  if (memcmp(actual, expected, sizeof(actual)) != 0) return -1;
  endpoint->journal_device = (uint64_t)opened.st_dev;
  endpoint->journal_inode = (uint64_t)opened.st_ino;
  memcpy(endpoint->journal_digest, actual, sizeof(actual));
  return 0;
}

static int capture_endpoint(
  FSEventStreamRef stream,
  dispatch_queue_t callback_queue,
  journal_state *state,
  bool seal,
  journal_endpoint *endpoint
) {
  FSEventStreamFlushSync(stream);
  dispatch_sync_f(callback_queue, NULL, callback_queue_barrier);
  int lock_result = pthread_mutex_lock(&state->mutex);
  if (lock_result != 0) return -1;
  int result = 0;
  if (state->failed
    || validate_journal_endpoint_file(state) < 0
    || fsync_retry(state->journal_fd) < 0
    || validate_journal_endpoint_digest(state, endpoint) < 0) {
    state->failed = true;
    result = -1;
  } else {
    if (seal) state->accepting_events = false;
    endpoint->journal_high_water = state->journal_offset;
    endpoint->entry_count = state->entry_count;
    endpoint->last_event_id = state->last_event_id;
  }
  pthread_mutex_unlock(&state->mutex);
  return result;
}

static int write_ack(
  int scratch_fd,
  uint16_t type,
  uint64_t sequence,
  const roots_attestation *roots,
  const journal_endpoint *endpoint
) {
  struct stat scratch_status;
  struct stat existing_ack;
  struct stat existing_commit;
  if (poll_parent_channel(0) < 0
    || fstat(scratch_fd, &scratch_status) < 0
    || !secure_directory_stat(&scratch_status)) return -1;
  int existing_ack_status = fstatat(scratch_fd, ACK_NAME, &existing_ack, AT_SYMLINK_NOFOLLOW);
  bool ack_missing = existing_ack_status < 0 && errno == ENOENT;
  int existing_commit_status = fstatat(
    scratch_fd,
    ACK_COMMIT_NAME,
    &existing_commit,
    AT_SYMLINK_NOFOLLOW
  );
  bool commit_missing = existing_commit_status < 0 && errno == ENOENT;
  if (type == ACK_READY) {
    if (!ack_missing || !commit_missing) return -1;
  } else if (existing_ack_status < 0
    || existing_commit_status < 0
    || !secure_regular_stat(&existing_ack, 0600U)
    || !secure_regular_stat(&existing_commit, 0600U)
    || existing_ack.st_size != (off_t)ACK_BYTES
    || existing_commit.st_size != (off_t)ACK_COMMIT_BYTES) {
    return -1;
  }

  uint8_t acknowledgement[ACK_BYTES] = {0};
  memcpy(acknowledgement, "MFSA", 4U);
  put_u16_le(acknowledgement + 4U, 2U);
  put_u16_le(acknowledgement + 6U, type);
  put_u32_le(acknowledgement + 8U, ACK_BYTES);
  put_u32_le(acknowledgement + 12U, 0U);
  put_u64_le(acknowledgement + 16U, sequence);
  put_u64_le(acknowledgement + 24U, endpoint->journal_high_water);
  put_u64_le(acknowledgement + 32U, endpoint->entry_count);
  put_u64_le(acknowledgement + 40U, endpoint->last_event_id);
  put_u64_le(acknowledgement + 48U, roots->count);
  memcpy(acknowledgement + 56U, roots->digest, sizeof(roots->digest));
  put_u64_le(acknowledgement + 88U, endpoint->journal_device);
  put_u64_le(acknowledgement + 96U, endpoint->journal_inode);
  memcpy(acknowledgement + 104U, endpoint->journal_digest, sizeof(endpoint->journal_digest));

  char acknowledgement_temporary_name[128];
  char commit_temporary_name[128];
  int acknowledgement_name_length = snprintf(
    acknowledgement_temporary_name,
    sizeof(acknowledgement_temporary_name),
    ".ack.bin.tmp.%ld.%llu.%u",
    (long)getpid(),
    (unsigned long long)sequence,
    (unsigned int)type
  );
  int commit_name_length = snprintf(
    commit_temporary_name,
    sizeof(commit_temporary_name),
    ".ack.commit.tmp.%ld.%llu.%u",
    (long)getpid(),
    (unsigned long long)sequence,
    (unsigned int)type
  );
  if (acknowledgement_name_length <= 0
    || (size_t)acknowledgement_name_length >= sizeof(acknowledgement_temporary_name)
    || commit_name_length <= 0
    || (size_t)commit_name_length >= sizeof(commit_temporary_name)) {
    return -1;
  }
  int acknowledgement_temporary_fd = openat(
    scratch_fd,
    acknowledgement_temporary_name,
    O_RDWR | O_CREAT | O_EXCL | O_CLOEXEC | O_NOFOLLOW,
    0600U
  );
  if (acknowledgement_temporary_fd < 0) return -1;
  int commit_temporary_fd = -1;
  int result = -1;
  if (fchmod(acknowledgement_temporary_fd, 0600U) < 0
    || validate_open_file_at(
      scratch_fd,
      acknowledgement_temporary_name,
      acknowledgement_temporary_fd,
      0600U
    ) < 0
    || pwrite_exact(
      acknowledgement_temporary_fd,
      acknowledgement,
      sizeof(acknowledgement),
      0
    ) < 0
    || ftruncate(acknowledgement_temporary_fd, (off_t)sizeof(acknowledgement)) < 0
    || fsync_retry(acknowledgement_temporary_fd) < 0) {
    goto ack_cleanup;
  }
  struct stat temporary_status;
  if (fstat(acknowledgement_temporary_fd, &temporary_status) < 0
    || temporary_status.st_size != (off_t)ACK_BYTES
    || validate_open_file_at(
      scratch_fd,
      acknowledgement_temporary_name,
      acknowledgement_temporary_fd,
      0600U
    ) < 0
    || renameat(scratch_fd, acknowledgement_temporary_name, scratch_fd, ACK_NAME) < 0
    || fsync_retry(scratch_fd) < 0
    || validate_open_file_at(
      scratch_fd,
      ACK_NAME,
      acknowledgement_temporary_fd,
      0600U
    ) < 0) {
    goto ack_cleanup;
  }
  struct stat published_status;
  if (fstat(acknowledgement_temporary_fd, &published_status) < 0
    || published_status.st_size != (off_t)ACK_BYTES) {
    goto ack_cleanup;
  }

  uint8_t acknowledgement_digest[CC_SHA256_DIGEST_LENGTH];
  uint8_t commit[ACK_COMMIT_BYTES] = {0};
  if (sha256_bytes(
      acknowledgement,
      sizeof(acknowledgement),
      acknowledgement_digest
    ) < 0) {
    goto ack_cleanup;
  }
  memcpy(commit, "MFAC", 4U);
  put_u16_le(commit + 4U, 2U);
  put_u16_le(commit + 6U, type);
  put_u32_le(commit + 8U, ACK_COMMIT_BYTES);
  put_u32_le(commit + 12U, 0U);
  put_u64_le(commit + 16U, sequence);
  put_u64_le(commit + 24U, (uint64_t)published_status.st_dev);
  put_u64_le(commit + 32U, (uint64_t)published_status.st_ino);
  memcpy(commit + 40U, acknowledgement_digest, sizeof(acknowledgement_digest));

  commit_temporary_fd = openat(
    scratch_fd,
    commit_temporary_name,
    O_RDWR | O_CREAT | O_EXCL | O_CLOEXEC | O_NOFOLLOW,
    0600U
  );
  if (commit_temporary_fd < 0
    || fchmod(commit_temporary_fd, 0600U) < 0
    || validate_open_file_at(
      scratch_fd,
      commit_temporary_name,
      commit_temporary_fd,
      0600U
    ) < 0
    || pwrite_exact(commit_temporary_fd, commit, sizeof(commit), 0) < 0
    || ftruncate(commit_temporary_fd, (off_t)sizeof(commit)) < 0
    || fsync_retry(commit_temporary_fd) < 0) {
    goto ack_cleanup;
  }
  struct stat commit_temporary_status;
  if (fstat(commit_temporary_fd, &commit_temporary_status) < 0
    || commit_temporary_status.st_size != (off_t)ACK_COMMIT_BYTES
    || validate_open_file_at(
      scratch_fd,
      commit_temporary_name,
      commit_temporary_fd,
      0600U
    ) < 0) {
    goto ack_cleanup;
  }
  /*
   * This rename is the ACK visibility/linearization point. No later operation
   * may turn it into a failure or make an additional durability claim.
   */
  if (poll_parent_channel(0) < 0
    || renameat(
      scratch_fd,
      commit_temporary_name,
      scratch_fd,
      ACK_COMMIT_NAME
    ) < 0) {
    goto ack_cleanup;
  }
  result = 0;

ack_cleanup:
  if (commit_temporary_fd >= 0) close(commit_temporary_fd);
  close(acknowledgement_temporary_fd);
  if (result != 0) {
    unlinkat(scratch_fd, acknowledgement_temporary_name, 0);
    unlinkat(scratch_fd, commit_temporary_name, 0);
  }
  return result;
}

static int read_command(
  int scratch_fd,
  uint64_t last_sequence,
  uint16_t last_type,
  const file_identity *last_identity,
  uint16_t *type,
  uint64_t *sequence,
  file_identity *identity
) {
  uint8_t command[COMMAND_BYTES];
  bool stable_command = false;
  off_t command_size = 0;
  struct stat stable_visible;
  for (unsigned int attempt = 0U; attempt < 4U && !stable_command; attempt += 1U) {
    int command_fd = openat(
      scratch_fd,
      COMMAND_NAME,
      O_RDONLY | O_CLOEXEC | O_NOFOLLOW | O_NONBLOCK
    );
    if (command_fd < 0) return -1;
    struct stat before;
    struct stat between;
    struct stat after;
    struct stat visible;
    if (fstat(command_fd, &before) < 0 || !secure_regular_stat(&before, 0600U)) {
      close(command_fd);
      return -1;
    }
    if (fstatat(scratch_fd, COMMAND_NAME, &visible, AT_SYMLINK_NOFOLLOW) < 0
      || !secure_regular_stat(&visible, 0600U)) {
      close(command_fd);
      return -1;
    }
    if (before.st_dev != visible.st_dev || before.st_ino != visible.st_ino) {
      close(command_fd);
      continue;
    }
    command_size = before.st_size;
    if (command_size != 0 && command_size != (off_t)COMMAND_BYTES) {
      close(command_fd);
      return -1;
    }
    uint8_t verification[COMMAND_BYTES] = {0};
    if (command_size == (off_t)COMMAND_BYTES
      && (pread_exact(command_fd, command, sizeof(command), 0) < 0
        || fstat(command_fd, &between) < 0
        || pread_exact(command_fd, verification, sizeof(verification), 0) < 0
        || memcmp(command, verification, sizeof(command)) != 0)) {
      close(command_fd);
      return -1;
    }
    if (command_size == 0) between = before;
    if (fstat(command_fd, &after) < 0
      || fstatat(scratch_fd, COMMAND_NAME, &visible, AT_SYMLINK_NOFOLLOW) < 0
      || !secure_regular_stat(&visible, 0600U)) {
      close(command_fd);
      return -1;
    }
    bool current_visible = after.st_dev == visible.st_dev && after.st_ino == visible.st_ino;
    bool unchanged = same_file_snapshot(&before, &between) && same_file_snapshot(&between, &after);
    close(command_fd);
    if (!current_visible) continue;
    if (!unchanged) return -1;
    stable_visible = visible;
    stable_command = true;
  }
  if (!stable_command) return -1;
  if (command_size == 0) return same_file_identity(last_identity, &stable_visible) ? 0 : -1;
  if (memcmp(command, "MFSC", 4U) != 0
    || get_u16_le(command + 4U) != 2U
    || get_u32_le(command + 8U) != COMMAND_BYTES) {
    return -1;
  }
  uint16_t requested_type = get_u16_le(command + 6U);
  uint64_t requested_sequence = get_u64_le(command + 12U);
  if (requested_type != COMMAND_FLUSH
    && requested_type != COMMAND_STOP
    && requested_type != COMMAND_SEAL) {
    return -1;
  }
  if (requested_sequence == last_sequence && requested_type == last_type) {
    return same_file_identity(last_identity, &stable_visible) ? 0 : -1;
  }
  if (requested_sequence == 0U || requested_sequence <= last_sequence) return -1;
  if (same_file_identity(last_identity, &stable_visible)) return -1;
  *type = requested_type;
  *sequence = requested_sequence;
  identity->device = stable_visible.st_dev;
  identity->inode = stable_visible.st_ino;
  return 1;
}

static bool journal_has_failed(journal_state *state) {
  int lock_result = pthread_mutex_lock(&state->mutex);
  if (lock_result != 0) return true;
  bool failed = state->failed;
  pthread_mutex_unlock(&state->mutex);
  return failed;
}

static void stop_and_release_stream(
  FSEventStreamRef *stream,
  dispatch_queue_t callback_queue,
  journal_state *state,
  bool started
) {
  int lock_result = pthread_mutex_lock(&state->mutex);
  if (lock_result == 0) {
    state->accepting_events = false;
    pthread_mutex_unlock(&state->mutex);
  }
  if (*stream != NULL) {
    if (started) FSEventStreamStop(*stream);
    dispatch_sync_f(callback_queue, NULL, callback_queue_barrier);
    FSEventStreamInvalidate(*stream);
    FSEventStreamRelease(*stream);
    *stream = NULL;
  }
}

static int wait_for_commands(
  int scratch_fd,
  FSEventStreamRef *stream,
  dispatch_queue_t callback_queue,
  journal_state *state,
  const roots_attestation *roots,
  const file_identity *startup_command_identity
) {
  uint64_t last_sequence = 0U;
  uint16_t last_type = 0U;
  file_identity last_identity = *startup_command_identity;
  for (;;) {
    if (poll_parent_channel(0) < 0 || journal_has_failed(state)) return -1;
    uint16_t command_type = 0U;
    uint64_t command_sequence = 0U;
    file_identity command_identity = {0};
    int command_status = read_command(
      scratch_fd,
      last_sequence,
      last_type,
      &last_identity,
      &command_type,
      &command_sequence,
      &command_identity
    );
    if (command_status < 0) return -1;
    if (command_status > 0) {
      bool terminal = command_type == COMMAND_STOP || command_type == COMMAND_SEAL;
      journal_endpoint endpoint = {0};
      if (poll_parent_channel(0) < 0) return -1;
      if (capture_endpoint(*stream, callback_queue, state, terminal, &endpoint) < 0) return -1;
      if (poll_parent_channel(0) < 0) return -1;
      if (terminal) {
        FSEventStreamStop(*stream);
        dispatch_sync_f(callback_queue, NULL, callback_queue_barrier);
        FSEventStreamInvalidate(*stream);
        FSEventStreamRelease(*stream);
        *stream = NULL;
        uint16_t ack_type = command_type == COMMAND_STOP ? ACK_STOP : ACK_SEAL;
        if (write_ack(scratch_fd, ack_type, command_sequence, roots, &endpoint) < 0) return -1;
        return 0;
      }
      if (write_ack(scratch_fd, ACK_FLUSH, command_sequence, roots, &endpoint) < 0) return -1;
      last_sequence = command_sequence;
      last_type = command_type;
      last_identity = command_identity;
    }
    if (poll_parent_channel(10) < 0) return -1;
  }
}

int main(int argc, char **argv) {
  if (argc != 2) {
    fprintf(stderr, "usage: mais-fsevents-journal PRIVATE_SCRATCH\n");
    return 64;
  }
  umask(0077U);
  int result = 1;
  int scratch_fd = -1;
  int config_fd = -1;
  int command_fd = -1;
  int journal_fd = -1;
  CFArrayRef roots = NULL;
  dispatch_queue_t callback_queue = NULL;
  FSEventStreamRef stream = NULL;
  bool stream_started = false;
  journal_state state;
  memset(&state, 0, sizeof(state));
  state.scratch_fd = -1;
  state.journal_fd = -1;
  bool mutex_initialized = false;
  file_identity startup_command_identity = {0};
  roots_attestation root_attestation = {0};

  if (validate_parent_channel() < 0 || poll_parent_channel(0) < 0) {
    fprintf(stderr, "stdin parent channel is not one live silent pipe or socket\n");
    goto cleanup;
  }

  scratch_fd = open_scratch(argv[1]);
  if (scratch_fd < 0) {
    fprintf(stderr, "private scratch is unsafe\n");
    goto cleanup;
  }
  config_fd = open_existing_secure(scratch_fd, ROOTS_CONFIG_NAME, O_RDONLY);
  command_fd = open_existing_secure(scratch_fd, COMMAND_NAME, O_RDONLY);
  if (config_fd < 0 || command_fd < 0) {
    fprintf(stderr, "config or command file is not a safe 0600 regular single-link file\n");
    goto cleanup;
  }
  struct stat startup_command_status;
  if (fstat(command_fd, &startup_command_status) < 0) {
    fprintf(stderr, "startup command identity is unavailable\n");
    goto cleanup;
  }
  startup_command_identity.device = startup_command_status.st_dev;
  startup_command_identity.inode = startup_command_status.st_ino;
  close(command_fd);
  command_fd = -1;
  roots = read_roots_config(scratch_fd, config_fd, &root_attestation);
  if (roots == NULL) {
    fprintf(stderr, "roots config is invalid or unsafe\n");
    goto cleanup;
  }
  journal_fd = create_secure_output(scratch_fd, JOURNAL_NAME);
  if (journal_fd < 0) {
    fprintf(stderr, "journal file is unsafe\n");
    goto cleanup;
  }
  state.scratch_fd = scratch_fd;
  state.journal_fd = journal_fd;
  state.accepting_events = true;
  if (CC_SHA256_Init(&state.expected_digest) != 1) {
    fprintf(stderr, "journal digest initialization failed\n");
    goto cleanup;
  }
  if (pthread_mutex_init(&state.mutex, NULL) != 0) {
    fprintf(stderr, "journal mutex initialization failed\n");
    goto cleanup;
  }
  mutex_initialized = true;
  callback_queue = dispatch_queue_create("hk.mais.typed-fsevents-journal", DISPATCH_QUEUE_SERIAL);
  if (callback_queue == NULL) {
    fprintf(stderr, "callback queue creation failed\n");
    goto cleanup;
  }

  FSEventStreamContext context = {0, &state, NULL, NULL, NULL};
  FSEventStreamCreateFlags create_flags = kFSEventStreamCreateFlagFileEvents
    | kFSEventStreamCreateFlagWatchRoot
    | kFSEventStreamCreateFlagNoDefer;
  stream = FSEventStreamCreate(
    NULL,
    append_events,
    &context,
    roots,
    kFSEventStreamEventIdSinceNow,
    0.05,
    create_flags
  );
  if (stream == NULL) {
    fprintf(stderr, "FSEvent stream creation failed\n");
    goto cleanup;
  }
  FSEventStreamSetDispatchQueue(stream, callback_queue);
  if (!FSEventStreamStart(stream)) {
    fprintf(stderr, "FSEvent stream start failed\n");
    goto cleanup;
  }
  stream_started = true;

  journal_endpoint ready_endpoint = {0};
  if (poll_parent_channel(0) < 0
    || capture_endpoint(stream, callback_queue, &state, false, &ready_endpoint) < 0
    || poll_parent_channel(0) < 0
    || write_ack(scratch_fd, ACK_READY, 0U, &root_attestation, &ready_endpoint) < 0) {
    fprintf(stderr, "READY acknowledgement failed\n");
    goto cleanup;
  }
  if (wait_for_commands(
    scratch_fd,
    &stream,
    callback_queue,
    &state,
    &root_attestation,
    &startup_command_identity
  ) < 0) {
    fprintf(stderr, "command, callback, or journal processing failed closed\n");
    goto cleanup;
  }
  stream_started = false;
  result = 0;

cleanup:
  if (mutex_initialized && callback_queue != NULL) {
    stop_and_release_stream(&stream, callback_queue, &state, stream_started);
  } else if (stream != NULL) {
    FSEventStreamInvalidate(stream);
    FSEventStreamRelease(stream);
  }
  if (roots != NULL) CFRelease(roots);
#if !OS_OBJECT_USE_OBJC
  if (callback_queue != NULL) dispatch_release(callback_queue);
#endif
  if (mutex_initialized) pthread_mutex_destroy(&state.mutex);
  if (journal_fd >= 0) close(journal_fd);
  if (command_fd >= 0) close(command_fd);
  if (config_fd >= 0) close(config_fd);
  if (scratch_fd >= 0) close(scratch_fd);
  return result;
}
