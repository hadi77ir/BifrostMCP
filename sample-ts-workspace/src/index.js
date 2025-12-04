export function greet(name, options = {}) {
    const prefix = options.prefix ?? "Hello";
    const suffix = options.suffix ?? "!";
    return `${prefix} ${name}${suffix}`;
}
export function average(values) {
    if (values.length === 0) {
        throw new Error("Cannot average an empty list");
    }
    const total = values.reduce((sum, value) => sum + value, 0);
    return total / values.length;
}
// Example usage while testing:
// console.log(greet("Bifrost"));
// console.log(average([1, 2, 3, 4]));
export function repeat(message, count) {
    if (count < 0) {
        throw new Error("Count must be non-negative");
    }
    return Array.from({ length: count }, () => message).join(" ");
}
//# sourceMappingURL=index.js.map