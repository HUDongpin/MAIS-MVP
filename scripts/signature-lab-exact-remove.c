#define _DARWIN_C_SOURCE 1

#include <CoreServices/CoreServices.h>
#include <dirent.h>
#include <errno.h>
#include <fcntl.h>
#include <inttypes.h>
#include <limits.h>
#include <stdbool.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <sys/stat.h>
#include <sys/types.h>
#include <unistd.h>

#ifndef O_CLOEXEC
#error "signature-lab-exact-remove requires O_CLOEXEC"
#endif
#ifndef O_DIRECTORY
#error "signature-lab-exact-remove requires O_DIRECTORY"
#endif
#ifndef O_NOFOLLOW
#error "signature-lab-exact-remove requires O_NOFOLLOW"
#endif
#ifndef AT_SYMLINK_NOFOLLOW
#error "signature-lab-exact-remove requires AT_SYMLINK_NOFOLLOW"
#endif
#ifndef AT_REMOVEDIR
#error "signature-lab-exact-remove requires AT_REMOVEDIR"
#endif
#ifndef NAME_MAX
#define NAME_MAX 255
#endif

typedef enum {
  ENTRY_DIRECTORY = 1,
  ENTRY_REGULAR
} EntryType;

typedef struct {
  uintmax_t dev;
  uintmax_t ino;
  uintmax_t uid;
  unsigned mode;
  uintmax_t nlink;
  EntryType type;
} EntryIdentity;

static const char *g_stage = "VALIDATE_ARGUMENTS";
static int g_error_number = 0;
static char g_retained_basename[NAME_MAX + 1];

static bool parse_uintmax(const char *value, uintmax_t *parsed) {
  if (value == NULL || value[0] == '\0' || value[0] == '+' || value[0] == '-') return false;
  errno = 0;
  char *end = NULL;
  uintmax_t result = strtoumax(value, &end, 10);
  if (errno != 0 || end == value || end == NULL || *end != '\0') return false;
  *parsed = result;
  return true;
}

static bool valid_basename(const char *value) {
  if (value == NULL) return false;
  size_t length = strlen(value);
  if (length == 0 || length > NAME_MAX ||
      (length == 1 && value[0] == '.') ||
      (length == 2 && value[0] == '.' && value[1] == '.')) return false;
  for (size_t index = 0; index < length; ++index) {
    unsigned char character = (unsigned char)value[index];
    bool allowed = (character >= (unsigned char)'a' && character <= (unsigned char)'z') ||
      (character >= (unsigned char)'A' && character <= (unsigned char)'Z') ||
      (character >= (unsigned char)'0' && character <= (unsigned char)'9') ||
      character == (unsigned char)'.' || character == (unsigned char)'_' ||
      character == (unsigned char)'-';
    if (!allowed) return false;
  }
  return true;
}

static EntryType type_from_mode(mode_t mode) {
  if (S_ISDIR(mode)) return ENTRY_DIRECTORY;
  if (S_ISREG(mode)) return ENTRY_REGULAR;
  return 0;
}

static EntryIdentity identity_from_stat(const struct stat *metadata) {
  EntryIdentity identity;
  identity.dev = (uintmax_t)metadata->st_dev;
  identity.ino = (uintmax_t)metadata->st_ino;
  identity.uid = (uintmax_t)metadata->st_uid;
  identity.mode = (unsigned)(metadata->st_mode & 07777U);
  identity.nlink = (uintmax_t)metadata->st_nlink;
  identity.type = type_from_mode(metadata->st_mode);
  return identity;
}

static bool same_identity(const EntryIdentity *left, const EntryIdentity *right) {
  return left->dev == right->dev && left->ino == right->ino && left->uid == right->uid &&
    left->mode == right->mode && left->nlink == right->nlink && left->type == right->type;
}

static bool same_identity_without_nlink(const EntryIdentity *left,
    const EntryIdentity *right) {
  return left->dev == right->dev && left->ino == right->ino && left->uid == right->uid &&
    left->mode == right->mode && left->type == right->type;
}

static int fail_at(const char *stage, int error_number) {
  g_stage = stage;
  g_error_number = error_number == 0 ? EIO : error_number;
  return -1;
}

static int observe_named(int parent_fd, const char *name, EntryIdentity *identity) {
  struct stat metadata;
  if (fstatat(parent_fd, name, &metadata, AT_SYMLINK_NOFOLLOW) != 0) return -1;
  *identity = identity_from_stat(&metadata);
  return 0;
}

static bool directory_is_empty(int descriptor) {
  int duplicate = dup(descriptor);
  if (duplicate < 0) return false;
  DIR *directory = fdopendir(duplicate);
  if (directory == NULL) {
    (void)close(duplicate);
    return false;
  }
  rewinddir(directory);
  bool empty = true;
  errno = 0;
  for (;;) {
    struct dirent *entry = readdir(directory);
    if (entry == NULL) break;
    if (strcmp(entry->d_name, ".") != 0 && strcmp(entry->d_name, "..") != 0) {
      empty = false;
      errno = ENOTEMPTY;
      break;
    }
  }
  int saved_errno = errno;
  if (closedir(directory) != 0 && empty) {
    empty = false;
    saved_errno = errno;
  }
  errno = saved_errno;
  return empty;
}

static bool directory_has_only(int descriptor, const char *expected_name) {
  int duplicate = dup(descriptor);
  if (duplicate < 0) return false;
  DIR *directory = fdopendir(duplicate);
  if (directory == NULL) {
    (void)close(duplicate);
    return false;
  }
  rewinddir(directory);
  bool found = false;
  bool exact = true;
  errno = 0;
  for (;;) {
    struct dirent *entry = readdir(directory);
    if (entry == NULL) break;
    if (strcmp(entry->d_name, ".") == 0 || strcmp(entry->d_name, "..") == 0) continue;
    if (found || strcmp(entry->d_name, expected_name) != 0) {
      exact = false;
      errno = ENOTEMPTY;
      break;
    }
    found = true;
  }
  int saved_errno = errno;
  if (closedir(directory) != 0 && exact) {
    exact = false;
    saved_errno = errno;
  }
  errno = saved_errno;
  return exact && found;
}

#if defined(__clang__)
#pragma clang diagnostic push
#pragma clang diagnostic ignored "-Wdeprecated-declarations"
#endif
static int fsref_from_descriptor(int descriptor, const EntryIdentity *expected,
    FSRef *reference) {
  char initial_descriptor_path[PATH_MAX];
  if (fcntl(descriptor, F_GETPATH, initial_descriptor_path) != 0) return -1;
  Boolean is_directory = false;
  OSErr status = FSPathMakeRef((const UInt8 *)initial_descriptor_path,
    reference, &is_directory);
  if (status != noErr) {
    errno = EIO;
    return -1;
  }
  if ((is_directory != false) != (expected->type == ENTRY_DIRECTORY)) {
    errno = EFTYPE;
    return -1;
  }
  FSCatalogInfo catalog;
  (void)memset(&catalog, 0, sizeof(catalog));
  status = FSGetCatalogInfo(reference,
    kFSCatInfoNodeFlags | kFSCatInfoPermissions,
    &catalog, NULL, NULL, NULL);
  if (status != noErr) {
    errno = EIO;
    return -1;
  }
  if ((uintmax_t)catalog.permissions.userID != expected->uid) {
    errno = EACCES;
    return -1;
  }
  if (((unsigned)catalog.permissions.mode & 07777U) != expected->mode) {
    errno = EPERM;
    return -1;
  }
  if (((catalog.nodeFlags & kFSNodeIsDirectoryMask) != 0U) !=
      (expected->type == ENTRY_DIRECTORY)) {
    errno = EFTYPE;
    return -1;
  }
  for (size_t attempt = 0; attempt < 2U; ++attempt) {
    char descriptor_path[PATH_MAX];
    UInt8 reference_path[PATH_MAX];
    if (fcntl(descriptor, F_GETPATH, descriptor_path) != 0 ||
        FSRefMakePath(reference, reference_path, (UInt32)sizeof(reference_path)) != noErr) {
      errno = EIO;
      return -1;
    }
    if (strcmp(descriptor_path, (const char *)reference_path) != 0) {
      errno = ESTALE;
      return -1;
    }
  }
  return 0;
}

static int unlink_exact_regular_fsref(FSRef *reference, int descriptor,
    const EntryIdentity *expected) {
  OSErr status = FSUnlinkObject(reference);
  if (status != noErr) {
    errno = status == fBsyErr ? EBUSY : EIO;
    return -1;
  }
  struct stat metadata;
  if (fstat(descriptor, &metadata) != 0) return -1;
  EntryIdentity unlinked = identity_from_stat(&metadata);
  if (!same_identity_without_nlink(&unlinked, expected) || unlinked.nlink != 0U) {
    errno = ESTALE;
    return -1;
  }
  return 0;
}

static int delete_exact_directory_fsref(FSRef *reference) {
  OSErr status = FSDeleteObject(reference);
  if (status != noErr) {
    errno = EIO;
    return -1;
  }
  if (FSIsFSRefValid(reference)) {
    errno = ESTALE;
    return -1;
  }
  return 0;
}
#if defined(__clang__)
#pragma clang diagnostic pop
#endif

#if defined(SIGNATURE_LAB_EXACT_REMOVE_TESTING)
static int write_exact(int descriptor, const char *bytes, size_t length) {
  size_t offset = 0;
  while (offset < length) {
    ssize_t written = write(descriptor, bytes + offset, length - offset);
    if (written < 0 && errno == EINTR) continue;
    if (written <= 0) return -1;
    offset += (size_t)written;
  }
  return 0;
}

static int read_exact(int descriptor, char *bytes, size_t length) {
  size_t offset = 0;
  while (offset < length) {
    ssize_t received = read(descriptor, bytes + offset, length - offset);
    if (received < 0 && errno == EINTR) continue;
    if (received <= 0) return -1;
    offset += (size_t)received;
  }
  return 0;
}
#endif

static int wait_at_test_barrier(int argc, char **argv, const char *requested_stage) {
#if defined(SIGNATURE_LAB_EXACT_REMOVE_TESTING)
  if (argc == 16 && strcmp(argv[12], "--test-ready-fd") == 0 &&
      strcmp(argv[14], "--test-continue-fd") == 0) {
    const char *configured_stage = getenv("SIGNATURE_LAB_EXACT_REMOVE_TEST_STAGE");
    if (configured_stage == NULL ||
        (strcmp(configured_stage, "before-name") != 0 &&
          strcmp(configured_stage, "after-fsref") != 0)) {
      return fail_at("TEST_BARRIER", EINVAL);
    }
    if (strcmp(configured_stage, requested_stage) != 0) return 0;
    uintmax_t ready_value;
    uintmax_t continue_value;
    if (!parse_uintmax(argv[13], &ready_value) || !parse_uintmax(argv[15], &continue_value) ||
        ready_value < 4U || ready_value > INT_MAX ||
        continue_value < 4U || continue_value > INT_MAX || ready_value == continue_value) {
      return fail_at("TEST_BARRIER", EINVAL);
    }
    static const char ready[] = "R";
    static const char continuation[] = "C";
    char observed[sizeof(continuation) - 1U];
    if (write_exact((int)ready_value, ready, sizeof(ready) - 1U) != 0 ||
        read_exact((int)continue_value, observed, sizeof(observed)) != 0 ||
        memcmp(observed, continuation, sizeof(observed)) != 0) {
      return fail_at("TEST_BARRIER", errno == 0 ? EPROTO : errno);
    }
  } else if (argc != 12) {
    return fail_at("TEST_BARRIER", EINVAL);
  }
#else
  (void)argv;
  (void)requested_stage;
  if (argc != 12) return fail_at("VALIDATE_ARGUMENTS", EINVAL);
#endif
  return 0;
}

static int remove_exact(int argc, char **argv) {
  const int parent_fd = 3;
  const char *basename = argv[1];
  if (!valid_basename(basename)) return fail_at("VALIDATE_ARGUMENTS", EINVAL);
  (void)snprintf(g_retained_basename, sizeof(g_retained_basename), "%s", basename);

  uintmax_t values[9];
  for (size_t index = 0; index < 9U; ++index) {
    if (!parse_uintmax(argv[index + 2U], &values[index])) {
      return fail_at("VALIDATE_ARGUMENTS", EINVAL);
    }
  }
  if (values[3] > 07777U || values[7] > 07777U ||
      (strcmp(argv[11], "regular") != 0 && strcmp(argv[11], "directory") != 0)) {
    return fail_at("VALIDATE_ARGUMENTS", EINVAL);
  }
  EntryIdentity expected_parent = {
    values[0], values[1], values[2], (unsigned)values[3], 0U, ENTRY_DIRECTORY
  };
  EntryIdentity expected = {
    values[4], values[5], values[6], (unsigned)values[7], values[8], ENTRY_REGULAR
  };
  expected.type = strcmp(argv[11], "directory") == 0 ? ENTRY_DIRECTORY : ENTRY_REGULAR;

  struct stat parent_metadata;
  if (fstat(parent_fd, &parent_metadata) != 0) return fail_at("BIND_PARENT", errno);
  EntryIdentity parent_identity = identity_from_stat(&parent_metadata);
  if (parent_identity.type != ENTRY_DIRECTORY || parent_identity.dev != expected_parent.dev ||
      parent_identity.ino != expected_parent.ino || parent_identity.uid != expected_parent.uid ||
      parent_identity.mode != expected_parent.mode) {
    return fail_at("BIND_PARENT", ESTALE);
  }

  int flags = O_RDONLY | O_NOFOLLOW | O_CLOEXEC;
  flags |= expected.type == ENTRY_DIRECTORY ? O_DIRECTORY : O_NONBLOCK;
  int entry_fd = openat(parent_fd, basename, flags);
  if (entry_fd < 0) return fail_at("OPEN_ENTRY", errno);
  struct stat entry_metadata;
  if (fstat(entry_fd, &entry_metadata) != 0) {
    int saved_errno = errno;
    (void)close(entry_fd);
    return fail_at("FSTAT_ENTRY", saved_errno);
  }
  EntryIdentity opened_identity = identity_from_stat(&entry_metadata);
  if (!same_identity(&opened_identity, &expected) ||
      (expected.type == ENTRY_REGULAR && expected.nlink != 1U)) {
    (void)close(entry_fd);
    return fail_at("VERIFY_EXPECTED_IDENTITY", ESTALE);
  }
  if (wait_at_test_barrier(argc, argv, "before-name") != 0) {
    (void)close(entry_fd);
    return -1;
  }

  EntryIdentity named_identity;
  if (observe_named(parent_fd, basename, &named_identity) != 0 ||
      !same_identity(&named_identity, &expected)) {
    int saved_errno = errno;
    (void)close(entry_fd);
    return fail_at("VERIFY_REMOVE_NAME", saved_errno == 0 ? ESTALE : saved_errno);
  }
  if (expected.type == ENTRY_DIRECTORY && !directory_is_empty(entry_fd)) {
    int saved_errno = errno;
    (void)close(entry_fd);
    return fail_at("VERIFY_EMPTY", saved_errno == 0 ? ENOTEMPTY : saved_errno);
  }

  FSRef exact_reference;
  if (fsref_from_descriptor(entry_fd, &expected, &exact_reference) != 0) {
    int saved_errno = errno;
    (void)close(entry_fd);
    return fail_at("BIND_EXACT_OBJECT_REFERENCE", saved_errno);
  }
  struct stat reference_metadata;
  if (fstat(entry_fd, &reference_metadata) != 0) {
    int saved_errno = errno;
    (void)close(entry_fd);
    return fail_at("REVALIDATE_EXACT_OBJECT_REFERENCE", saved_errno);
  }
  EntryIdentity reference_identity = identity_from_stat(&reference_metadata);
  if (!same_identity(&reference_identity, &expected)) {
    (void)close(entry_fd);
    return fail_at("REVALIDATE_EXACT_OBJECT_REFERENCE", ESTALE);
  }
  if (wait_at_test_barrier(argc, argv, "after-fsref") != 0) {
    (void)close(entry_fd);
    return -1;
  }
  if (expected.type == ENTRY_REGULAR) {
    if (unlink_exact_regular_fsref(&exact_reference, entry_fd, &expected) != 0) {
      int saved_errno = errno;
      (void)close(entry_fd);
      return fail_at("UNLINK_EXACT_OBJECT", saved_errno);
    }
    if (close(entry_fd) != 0) return fail_at("CLOSE_UNLINKED_ENTRY", errno);
  } else {
    if (close(entry_fd) != 0) return fail_at("CLOSE_BOUND_ENTRY", errno);
    if (delete_exact_directory_fsref(&exact_reference) != 0) {
      return fail_at("DELETE_EXACT_OBJECT", errno);
    }
  }
  EntryIdentity final_named_identity;
  if (observe_named(parent_fd, basename, &final_named_identity) == 0 || errno != ENOENT) {
    return fail_at("VERIFY_ORIGINAL_ABSENT", errno == 0 ? ESTALE : errno);
  }
  g_retained_basename[0] = '\0';
  if (fsync(parent_fd) != 0) return fail_at("FSYNC_REMOVE", errno);
  g_stage = "REMOVE_COMPLETE";
  g_error_number = 0;
  return 0;
}

static int remove_final_root(int argc, char **argv) {
  const int parent_fd = 3;
  const int root_fd = 4;
  if (argc != 18 || strcmp(argv[1], "--final-root") != 0 ||
      !valid_basename(argv[2]) || !valid_basename(argv[12])) {
    return fail_at("FINAL_VALIDATE_ARGUMENTS", EINVAL);
  }
  const char *root_basename = argv[2];
  const char *helper_basename = argv[12];
  (void)snprintf(g_retained_basename, sizeof(g_retained_basename), "%s", root_basename);

  uintmax_t values[14];
  for (size_t index = 0; index < 9U; ++index) {
    if (!parse_uintmax(argv[index + 3U], &values[index])) {
      return fail_at("FINAL_VALIDATE_ARGUMENTS", EINVAL);
    }
  }
  for (size_t index = 9U; index < 14U; ++index) {
    if (!parse_uintmax(argv[index + 4U], &values[index])) {
      return fail_at("FINAL_VALIDATE_ARGUMENTS", EINVAL);
    }
  }
  if (values[3] > 07777U || values[7] > 07777U || values[12] > 07777U) {
    return fail_at("FINAL_VALIDATE_ARGUMENTS", EINVAL);
  }
  EntryIdentity expected_parent = {
    values[0], values[1], values[2], (unsigned)values[3], 0U, ENTRY_DIRECTORY
  };
  EntryIdentity expected_root = {
    values[4], values[5], values[6], (unsigned)values[7], values[8], ENTRY_DIRECTORY
  };
  EntryIdentity expected_helper = {
    values[9], values[10], values[11], (unsigned)values[12], values[13], ENTRY_REGULAR
  };
  if (expected_helper.nlink != 1U) return fail_at("FINAL_VALIDATE_ARGUMENTS", EMLINK);

  struct stat metadata;
  if (fstat(parent_fd, &metadata) != 0) return fail_at("FINAL_BIND_PARENT", errno);
  EntryIdentity parent_identity = identity_from_stat(&metadata);
  if (parent_identity.type != ENTRY_DIRECTORY || parent_identity.dev != expected_parent.dev ||
      parent_identity.ino != expected_parent.ino || parent_identity.uid != expected_parent.uid ||
      parent_identity.mode != expected_parent.mode) {
    return fail_at("FINAL_BIND_PARENT", ESTALE);
  }
  if (fstat(root_fd, &metadata) != 0) return fail_at("FINAL_BIND_ROOT", errno);
  EntryIdentity root_identity = identity_from_stat(&metadata);
  EntryIdentity named_root;
  if (!same_identity(&root_identity, &expected_root) ||
      observe_named(parent_fd, root_basename, &named_root) != 0 ||
      !same_identity(&named_root, &expected_root)) {
    return fail_at("FINAL_BIND_ROOT", errno == 0 ? ESTALE : errno);
  }

  int helper_fd = openat(root_fd, helper_basename,
    O_RDONLY | O_NOFOLLOW | O_CLOEXEC | O_NONBLOCK);
  if (helper_fd < 0) return fail_at("FINAL_OPEN_HELPER", errno);
  if (fstat(helper_fd, &metadata) != 0) {
    int saved_errno = errno;
    (void)close(helper_fd);
    return fail_at("FINAL_FSTAT_HELPER", saved_errno);
  }
  EntryIdentity helper_identity = identity_from_stat(&metadata);
  EntryIdentity named_helper;
  if (!same_identity(&helper_identity, &expected_helper) ||
      observe_named(root_fd, helper_basename, &named_helper) != 0 ||
      !same_identity(&named_helper, &expected_helper) ||
      !directory_has_only(root_fd, helper_basename)) {
    int saved_errno = errno;
    (void)close(helper_fd);
    return fail_at("FINAL_VERIFY_INVENTORY", saved_errno == 0 ? ESTALE : saved_errno);
  }

  FSRef helper_reference;
  FSRef root_reference;
  if (fsref_from_descriptor(helper_fd, &expected_helper, &helper_reference) != 0 ||
      fsref_from_descriptor(root_fd, &expected_root, &root_reference) != 0) {
    int saved_errno = errno;
    (void)close(helper_fd);
    return fail_at("FINAL_BIND_EXACT_OBJECT_REFERENCES", saved_errno);
  }
  struct stat helper_recheck_metadata;
  struct stat root_recheck_metadata;
  if (fstat(helper_fd, &helper_recheck_metadata) != 0 ||
      fstat(root_fd, &root_recheck_metadata) != 0) {
    int saved_errno = errno;
    (void)close(helper_fd);
    return fail_at("FINAL_REVALIDATE_OBJECT_REFERENCES", saved_errno);
  }
  EntryIdentity helper_recheck = identity_from_stat(&helper_recheck_metadata);
  EntryIdentity root_recheck = identity_from_stat(&root_recheck_metadata);
  if (!same_identity(&helper_recheck, &expected_helper) ||
      !same_identity(&root_recheck, &expected_root) ||
      observe_named(root_fd, helper_basename, &named_helper) != 0 ||
      !same_identity(&named_helper, &expected_helper) ||
      observe_named(parent_fd, root_basename, &named_root) != 0 ||
      !same_identity(&named_root, &expected_root) ||
      !directory_has_only(root_fd, helper_basename)) {
    int saved_errno = errno;
    (void)close(helper_fd);
    return fail_at("FINAL_REVALIDATE_OBJECT_REFERENCES",
      saved_errno == 0 ? ESTALE : saved_errno);
  }

  if (unlink_exact_regular_fsref(&helper_reference, helper_fd, &expected_helper) != 0) {
    int saved_errno = errno;
    (void)close(helper_fd);
    return fail_at("FINAL_UNLINK_EXACT_HELPER", saved_errno);
  }
  EntryIdentity final_named_helper;
  if (observe_named(root_fd, helper_basename, &final_named_helper) == 0 || errno != ENOENT) {
    int saved_errno = errno;
    (void)close(helper_fd);
    return fail_at("FINAL_VERIFY_HELPER_ABSENT", saved_errno == 0 ? ESTALE : saved_errno);
  }
  if (close(helper_fd) != 0) return fail_at("FINAL_CLOSE_UNLINKED_HELPER", errno);
  if (fsync(root_fd) != 0 || !directory_is_empty(root_fd)) {
    return fail_at("FINAL_FSYNC_EMPTY_ROOT", errno == 0 ? ENOTEMPTY : errno);
  }
  if (close(root_fd) != 0) return fail_at("FINAL_CLOSE_ROOT", errno);
  if (delete_exact_directory_fsref(&root_reference) != 0) {
    return fail_at("FINAL_DELETE_EXACT_ROOT", errno);
  }
  EntryIdentity final_named_root;
  if (observe_named(parent_fd, root_basename, &final_named_root) == 0 || errno != ENOENT) {
    return fail_at("FINAL_VERIFY_ROOT_ABSENT", errno == 0 ? ESTALE : errno);
  }
  g_retained_basename[0] = '\0';
  if (fsync(parent_fd) != 0) return fail_at("FINAL_FSYNC_REMOVE", errno);
  g_stage = "FINAL_REMOVE_COMPLETE";
  g_error_number = 0;
  return 0;
}

static void print_json(bool ok) {
  (void)printf("{\"schema\":\"ca.signature-lab.exact-remove.v1\","
    "\"ok\":%s,\"stage\":\"%s\",\"errno\":%d,\"retainedBasename\":\"%s\"}\n",
    ok ? "true" : "false", g_stage, g_error_number, g_retained_basename);
}

int main(int argc, char **argv) {
  if (argc == 18 && strcmp(argv[1], "--final-root") == 0) {
    int result = remove_final_root(argc, argv);
    print_json(result == 0);
    return result == 0 ? 0 : 68;
  }
  if (argc != 12
#if defined(SIGNATURE_LAB_EXACT_REMOVE_TESTING)
      && argc != 16
#endif
  ) {
    (void)fail_at("VALIDATE_ARGUMENTS", EINVAL);
    print_json(false);
    return 64;
  }
  int result = remove_exact(argc, argv);
  print_json(result == 0);
  return result == 0 ? 0 : 67;
}
