# Alexa voice interaction model

```mermaid
graph TD
    Start --> A{Account<br>linked?}
    A -->|Yes| B[Reminders]
    A -->|Yes| C[Blood Glucose]
    A -->|Yes| D[Medication requests]
```

_The patient needs to link their account before performing any action._

```mermaid
graph TD
    subgraph "Blood glucose"
    
    R2[Register my glucose level]
    A2>Stores the glucose level\nto the service]
    R3["`What was my glucose level on **{date}**?`"]
    A3>"`Queries the service for Observations on **{date}**`"]
    
    R2 --> A2
    R3 --> A3
    end
```

```mermaid
graph TD
    subgraph "Medication requests"
        R4["`What medications do I have to take on **{date}**?`"]
        A4>"`Queries for medication requests for the **{date range}**`"]
        C3{Does any<br>medication needs<br>a start date?}
        A4B>"`Asks and registers medication **{start date}**`"]

        R4 --> A4
        A4 --> C3
        C3 -->|Yes| A4B
    end
```

```mermaid
graph TD
    subgraph Reminders
        R5[Create reminders]
        A5A>Queries the active care plan<br>and creates Alexa reminders]
        C2{Reminder<br>permissions<br>granted?}
        A5B>Requests reminder permissions]
        C4{Does any<br>resource need<br>a start date}
        A6>"`Asks and registers resource **{start dates}**`"]
        C5{Does any<br>food timing<br>need a time}
        A7>"`Asks and registers **{food timings times}**`"]

        R5 --> C2
        C2 -->|No| A5B
        C2 -->|Yes| C4
        C4 -->|Yes| A6
        C4 -->|No| C5
        C5 -->|Yes| A7
        C5 -->|No| A5A
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

    R2[Register my glucose level]

    A2>Stores the glucose level\nto the service]

    R3["`What was my glucose level on **{date}**?`"]

    A3>"`Queries the service for Observations on **{date}**`"]

    R4["`What medications do I have to take on **{date}**?`"]

    A4>"`Queries for medication requests for the **{date range}**`"]

    R5[Create reminders]

    A5A>Queries the active care plan\nand creates Alexa reminders]

    C2{Reminder\npermissions\ngranted?}

    A5B>Requests reminder permissions]

    C3{Does any\nmedication needs\na start date?}

    A4B>"`Asks and registers medication **{start date}**`"]

    C4{Does any\nresource need\na start date}

    A6>"`Asks and registers resource **{start dates}**`"]

    C5{Does any\nfood timing\nneed a time}

    A7>"`Asks and registers **{food timings times}**`"]

    
    S --> A1

    A1 ---> C1

    AccountLink --> C1

    subgraph AccountLink

        direction LR

        C1 -->|No| R1

        C1 -->|Yes| VI

    end

    VI --> Glucose

    subgraph Glucose

        R2 --> A2

        R3 --> A3

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

        C4 -->|No| C5

        C5 -->|Yes| A7

        C5 -->|No| A5A

    end

```

## User actions

### What medications do I have to take on {date}? (2)

Queries active `medication requests` on a given date

### Remind me to take my medications (1)(2)

Queries active `medication requests` and creates reminders based on the frequency dates

### Create reminders (TBD) (1)(2)

Queries active `care plans` and creates reminders for `medication requests` and `service requests`

### What was my blood glucose level on {date}?

Queries `observations` on a given date

### Register my blood glucose level

Saves a blood glucose level reading

---

The following are prompted when some set up is needed

#### [1] Set up: food timing time

The medication or service request is requested to be performed/taken on a food timing time (e.g., before breakfast, etc.). Prompts the patient to set up a time for each food timing when needed

#### [2] Set up: resource (medication/service request) start date

The medication or service request doesn't have a specific start date (e.g., take pills for two weeks, doesn't say when to start). Prompts the patient to set up a start date for those resources.
