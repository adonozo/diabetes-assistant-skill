import { AbstractIntentHandler } from "./abstractIntentHandler";
import { getRequestType, HandlerInput } from "ask-sdk-core";
import { interfaces, Response } from "ask-sdk-model";
import ConnectionsResponse = interfaces.connections.ConnectionsResponse;
import { getLocalizedStrings } from "../utils/intent";

export class ConnectionsResponseHandler extends AbstractIntentHandler {
    intentName: string = "Connections.Response";

    canHandle(handlerInput: HandlerInput): Promise<boolean> | boolean {
        return getRequestType(handlerInput.requestEnvelope) === 'Connections.Response';
    }

    handle(handlerInput: HandlerInput): Promise<Response> | Response {
        const { permissions } = handlerInput.requestEnvelope.context.System.user;
        if (!permissions) {
            return this.requestReminderPermission(handlerInput);
        }

        const request = handlerInput.requestEnvelope.request as ConnectionsResponse;
        const status = request.payload?.status;
        const localizedMessages = getLocalizedStrings(handlerInput);
        switch (status) {
            case "DENIED":
            case "NOT_ANSWERED":
                return handlerInput.responseBuilder
                    .speak(localizedMessages.responses.PERMISSIONS_REQUIRED)
                    .getResponse();
            case "ACCEPTED":
            default:
                return handlerInput.responseBuilder
                    .speak(localizedMessages.responses.SUCCESSFUL_REMINDER_PERMISSION)
                    .reprompt(localizedMessages.responses.SUCCESSFUL_REMINDER_PERMISSION_REPROMPT)
                    .getResponse();
        }
    }

}
