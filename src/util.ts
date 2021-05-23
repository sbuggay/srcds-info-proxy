export const promiseWithTimeout = async <T>(timeoutMs: number, promise: () => Promise<T>, failureMessage?: string) => {
    let timeoutHandle: NodeJS.Timeout;
    const timeoutPromise = new Promise<never>((resolve, reject) => {
        timeoutHandle = setTimeout(() => reject(new Error(failureMessage)), timeoutMs);
    });

    return await Promise.race([
        promise(),
        timeoutPromise,
    ]).then((result) => {
        clearTimeout(timeoutHandle);
        return result;
    });
}