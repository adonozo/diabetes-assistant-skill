import { HandlerInput, RequestHandler } from "ask-sdk-core";
import { Response } from "ask-sdk-model";
import { getLocalizedStrings } from "../utils/intent";
import { getAuthorizedUser } from "../auth";
import { getLastRequest } from "../api/alexa";
import { errorIsProblemDetails } from "../api/api";

export class LaunchRequestHandler implements RequestHandler {
    canHandle(handlerInput: HandlerInput): boolean {
        const request = handlerInput.requestEnvelope.request;
        return request.type === 'LaunchRequest';
    }

    async handle(handlerInput: HandlerInput): Promise<Response> {
        const localizedMessages = getLocalizedStrings(handlerInput);
        const speakOutput = await this.isFirstRequestEver(handlerInput)
            ? localizedMessages.responses.WELCOME_FIRST
            : localizedMessages.responses.WELCOME;

        return handlerInput.responseBuilder
            .speak(speakOutput)
            .reprompt(localizedMessages.responses.WELCOME_REPROMPT)
            .getResponse();
    }

    private async isFirstRequestEver(handlerInput: HandlerInput): Promise<boolean> {
        const userInfo = await getAuthorizedUser(handlerInput);
        if (!userInfo) {
            return true;
        }

        const deviceId = handlerInput.requestEnvelope.context.System.device?.deviceId ?? '';
        try {
            await getLastRequest(userInfo.username, deviceId);
            return false;
        } catch (errorResponse: unknown) {
            if (errorIsProblemDetails(errorResponse)) {
                return errorResponse.status === 404;
            }

            return true;
        }
    }
}
