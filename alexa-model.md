# Alexa voice interaction model

```mermaid
graph TD
    Start --> A{Account<br>linked?}
    A -->|Yes| B[Reminders]
    A -->|Yes| D[Medication requests]
    A -->|Yes| C[Service requets]
    E{Needs<br>setup?}
    F[Set start date/time]
    B --> E
    D --> E
    E --> F 
```

_The patient needs to link their account before performing any action._

```mermaid
graph TD
    subgraph "Medication requests"
        R4["`What medications do I have to take?`"]
        A4>"`Queries for medication requests for today`"]
        C3{Does any<br>medication needs<br>a start date?}
        A4B>"`Asks and registers medication **{start date}**`"]

        R4 --> A4
        A4 --> C3
        C3 -->|Yes| A4B
    end
```

```mermaid
graph TD
    subgraph "Service requests (blood glucose level measurements)"
        R7["When do I have to measure my blood glucose?"]
        A7>"Queries for service requests for the next 7 days"]
        C7{Does any<br>request need<br>a start date?}
        A7B>"`Asks and registers **{start date}**`"]
        C8{"Are there<br>requests in the<br>next 2 days?"}
        A8A>"Presents service requests"]
        A8B>"Presents next day with requests"]

        R7 --> A7
        A7 --> C7
        C7 -->|Yes| A7B
        C7 -->|No| C8
        C8 -->|Yes| A8A
        C8 -->|No| A8B
    end
```

```mermaid
graph TD
    subgraph Reminders
        R5[Create reminders]
        A5A>"`Asks for a **{time}** and creates daily reminders`"]
        C2{Reminder<br>permissions<br>granted?}
        A5B>Requests reminder permissions]
        C4{Does any<br>resource need<br>a start date}
        A6>"`Asks and registers resource **{start dates}**`"]

        R5 --> C2
        C2 -->|No| A5B
        C2 -->|Yes| C4
        C4 -->|Yes| A6
        C4 -->|No| A5A
    end
```

Entire model

```mermaid
flowchart LR

    S((START))
    A1["`Open Skill: *diabetes assistant*`"]
    C1{Account\nLinked?}
    R1>Request to link account]
    VI{{Voice interaction}}
    R4["`What medications do I have to take`"]
    A4>"`Queries for medication requests for today`"]
    R5[Create reminders]
    A5A>"`Asks for a **{time}** and creates daily reminders`"]
    C2{Reminder\npermissions\ngranted?}
    A5B>Requests reminder permissions]
    C3{Does any\nmedication needs\na start date?}
    A4B>"`Asks and registers medication **{start date}**`"]
    C4{Does any\nresource need\na start date}
    A6>"`Asks and registers resource **{start dates}**`"]
    R7["When do I have to measure my blood glucose?"]
    A7>"Queries for active service requests"]
    C7{Does any<br>service request need<br>a start date?}
    A7B>"`Asks and registers **{start date}**`"]
    C8{"Are there<br>requests in the<br>next 2 days?"}
    A8A>"Presents service requests"]
    A8B>"Presents next day with requests"]

    S --> A1
    A1 ---> C1

    AccountLink --> C1

    subgraph AccountLink
        direction LR
        C1 -->|No| R1
        C1 -->|Yes| VI
    end
    
    VI --> ServiceRequest
    
    subgraph ServiceRequest
        R7 --> A7
        A7 --> C7
        C7 -->|Yes| A7B
        C7 -->|No| C8
        C8 -->|Yes| A8A
        C8 -->|No| A8B
    end

    VI --> MedicationRequest

    subgraph MedicationRequest
        R4 --> A4
        A4 --> C3
        C3 -->|Yes| A4B
    end

    VI --> Reminders

    subgraph Reminders
        R5 --> C2
        C2 -->|No| A5B
        C2 -->|Yes| C4
        C4 -->|Yes| A6
        C4 -->|No| A5A
    end
```

## User actions

### What medications do I have to take?

Queries active `medication requests` for today

### When do I have to measure my blood glucose?

Queries active `service requests` for the next 7 days. Tells the patient the plan for next 3 days (inclusive of the present day). If there's no activity in those days, it will take the next day of an scheduled activity.

### Create reminders at {time} (1)

Creates daily reminders at the provided time. Reminders will honor the requests' day of week (e.g. will not create a reminder in a day when the patient does not have a scheduled medication).

Queries active `care plans` and creates reminders for `medication requests` and `service requests`.

---

#### Date restrictions

Dates cause awkward interactions as they can be expressed in multiple ways. Moreover, patients wouldn't ask for medications for past dates, like the week before. Therefore, the skill only queries dates from the current day. By taking the complexities of dates out, patients have clear expectations about the responses.

---

The following is prompted when some set up is needed

#### [1] Set up: resource (medication/service request) start date/time

The medication or service request doesn't have a specific start date/time (e.g., take pills twice a day for two weeks, it doesn't say when to start). Prompts the patient to set up a start date and start time if needed.
