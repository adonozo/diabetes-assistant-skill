import { RequestOptions } from "https";
import { HttpResolvePromise, ProblemDetails } from "../types";
import { IncomingMessage } from "http";

const baseUrl = '__ENV_BACKEND_URL';
const port = '__ENV_BACKEND_PORT';

export function createJsonResponse<T>(
    resolve: HttpResolvePromise<T>,
    reject: (reason: any) => void,
    response: IncomingMessage
): void {
    response.setEncoding('utf8');
    let responseData = '';
    const failed = !response.statusCode || response.statusCode < 200 || response.statusCode > 299;

    response.on('data', chunk => {
        responseData += chunk;
    });

    response.on("end", () => {
        let result;
        try {
            result = JSON.parse(responseData)
        } catch (e) {
            result = {};
        }

        if (failed) {
            reject(result);
        }

        resolve(result);
    });

    response.on("error", err => {
        reject(err);
    });
}

export function getOptionsFor(path: string, method: string): RequestOptions {
    return {
        host: baseUrl,
        port: port,
        path: path,
        method: method,
    };
}

export function errorIsProblemDetails(error: any): error is ProblemDetails {
    return error != undefined && error.status != undefined;
}
