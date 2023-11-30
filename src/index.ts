import { DefaultApiClient, SkillBuilders } from 'ask-sdk-core';
import { CreateRemindersHandler, CreateRemindersInProgressHandler } from "./intents/createReminderHandlers";
import { MedicationToTakeHandler } from "./intents/getMedicationToTakeHandler";
import { SetStartDateTimeCompletedHandler, SetStartDateTimeContinueHandler } from "./intents/setStartDateHandlers";
import {
    GetGlucoseLevelDateAndTimeHandler,
    GetGlucoseLevelDateAndTimingHandler,
    GetGlucoseLevelDateHandler,
    GetGlucoseLevelTimeHandler
} from "./intents/getGlucoseLeveIHandlers";
import { ConnectionsResponseHandler } from "./intents/connectionsResponseHandler";
import { LaunchRequestHandler } from "./intents/launchRequestHandler";
import { HelpHandler } from "./intents/helpHandler";
import { CancelAndStopHandler } from "./intents/cancelAndStopHandler";
import { ErrorHandler } from "./intents/errorHandler";
import { SessionEndedRequestHandler } from "./intents/sessionEndedRequestHandler";
import { SearchNextServiceRequestsHandler } from "./intents/searchNextServiceRequestsHandler";

exports.handler = SkillBuilders.custom()
    .addRequestHandlers(
        new LaunchRequestHandler(),
        new ConnectionsResponseHandler(),
        new CreateRemindersInProgressHandler(),
        new CreateRemindersHandler(),
        new MedicationToTakeHandler(),
        new SearchNextServiceRequestsHandler(),
        new SetStartDateTimeContinueHandler(),
        new SetStartDateTimeCompletedHandler(),
        new GetGlucoseLevelDateAndTimingHandler(),
        new GetGlucoseLevelDateAndTimeHandler(),
        new GetGlucoseLevelDateHandler(),
        new GetGlucoseLevelTimeHandler(),
        new HelpHandler(),
        new CancelAndStopHandler(),
        new SessionEndedRequestHandler(),
    )
    .addErrorHandlers(new ErrorHandler())
    .withApiClient(new DefaultApiClient())
    .lambda();
