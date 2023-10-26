import { HandlerInput, RequestHandler } from "ask-sdk-core";
import { Response, SessionEndedRequest } from "ask-sdk-model";
import { logMessage } from "../utils/helper";

export class SessionEndedRequestHandler implements RequestHandler {
    canHandle(handlerInput: HandlerInput): Promise<boolean> | boolean {
        const request = handlerInput.requestEnvelope.request;
        return request.type === 'SessionEndedRequest';
    }

    handle(handlerInput: HandlerInput): Response {
        const reason = (handlerInput.requestEnvelope.request as SessionEndedRequest).reason;
        logMessage('Session ended with reason:', reason)
        return handlerInput.responseBuilder.getResponse();
    }

}
