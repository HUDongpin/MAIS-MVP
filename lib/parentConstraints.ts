export const parentInviteCodeMaxLength = 32;
export const parentMessageSubjectMaxLength = 160;
export const parentMessageBodyMaxLength = 2000;

export function isWithinParentTextLimit(value: string, maxLength: number) {
  return value.length <= maxLength;
}
