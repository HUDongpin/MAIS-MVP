export type CourseImportErrorCode =
  | "PACKAGE_EMPTY"
  | "PACKAGE_TOO_LARGE"
  | "ZIP_INVALID"
  | "ZIP64_UNSUPPORTED"
  | "ZIP_MULTIDISK_UNSUPPORTED"
  | "ZIP_ENTRY_LIMIT_EXCEEDED"
  | "ZIP_ENTRY_TOO_LARGE"
  | "ZIP_TOTAL_SIZE_EXCEEDED"
  | "ZIP_PATH_UNSAFE"
  | "ZIP_DUPLICATE_PATH"
  | "ZIP_DATA_DESCRIPTOR_UNSUPPORTED"
  | "ZIP_DIRECTORY_INVALID"
  | "ZIP_LINK_UNSUPPORTED"
  | "ZIP_SPECIAL_FILE_UNSUPPORTED"
  | "ZIP_ENCRYPTED_ENTRY"
  | "ZIP_COMPRESSION_UNSUPPORTED"
  | "ZIP_FILENAME_ENCODING_UNSUPPORTED"
  | "MANIFEST_MISSING"
  | "MANIFEST_TOO_LARGE"
  | "MANIFEST_ENCODING_UNSUPPORTED"
  | "MANIFEST_XML_DTD_FORBIDDEN"
  | "MANIFEST_XML_INVALID"
  | "SCORM_VERSION_UNSUPPORTED"
  | "SCORM_MANIFEST_INVALID"
  | "SCORM_FIELD_TOO_LARGE"
  | "SCORM_XML_BASE_UNSAFE"
  | "REPORT_TOO_LARGE";

export class CourseImportError extends Error {
  readonly code: CourseImportErrorCode;
  readonly status: 400 | 413 | 422;

  constructor(code: CourseImportErrorCode, message: string, status: 400 | 413 | 422) {
    super(message);
    this.name = "CourseImportError";
    this.code = code;
    this.status = status;
  }
}

export function isCourseImportError(error: unknown): error is CourseImportError {
  return error instanceof CourseImportError;
}
