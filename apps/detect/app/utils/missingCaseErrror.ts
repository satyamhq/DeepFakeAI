/*
 *  Helper to achieve exhaustive static type checking of enums and union types.
 *
 *  Call this in a `default` or `else` case after you've checked every type,
 *  and TypeScript will fail to compile if you forgot any type.
 *
 *  E.g.:
 *
 *      enum BlobType { Image, Video, Other }
 *
 *      function getPrefix(bt: BlobType): string {
 *          switch (bt: BlobType) {
 *              case BlobType.Image: return ...
 *              case BlobType.Video: return ...
 *              default: throw missingCaseError(bt)
 *          }
 *      }
 *
 *  The above code will fail to compile (even in non-strict mode), because the
 *  `Other` type wasn't checked.
 *
 *  ====
 *
 *  This utility returns an error that you can throw in case this *does* happen
 *  at runtime. That could happen with incorrect casting or e.g. an `any` value.
 *
 *  You can use that to your advantage to parse user input, as well:
 *  Cast the input to a strongly typed variable to get exhaustive type checking
 *  (so you don't forget to update your code when a new type is added),
 *  and rely on the `default` case to handle bad user input.
 *
 *  ====
 */
export const missingCaseError = (x: never): Error => {
  return new Error(`This case should never happen! ${x}`)
}
