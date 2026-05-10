export interface IValidator<T> {
    validate(value: T): void;
}
