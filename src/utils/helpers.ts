export function getStyleString(style: Record<string, any>): string {
    return Object.entries(style ?? {}).map(([key, value]) => `${key}: ${value}`).join('; ');
}

export function ucfirst(str: string): string {
    return str.charAt(0).toUpperCase() + str.slice(1);
}

export function cloneDeep<T>(obj: T): T {
    return JSON.parse(JSON.stringify(obj));
}

export function toMerged<T extends Record<string, any>>(...args: T[]): T {
    return Object.assign({}, ...args);
}
