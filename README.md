# A voice assistant for type 2 diabetes mellitus treatments

---

## Alexa skill - Diabetes Assistant

This project was created with the [ASK CLI](https://github.com/alexa/ask-cli). It generates automatically the folder structure and components.

It uses the following libraries:
 
 - The [ASK SDK](https://www.npmjs.com/package/aws-sdk). 
 - [Luxon](https://github.com/moment/luxon)
 - [rrule.js](https://github.com/jakubroztocil/rrule)

### Requirements

An Alexa Developer account is required. It can be created for free in the [Alexa Developer webpage](https://developer.amazon.com/en-GB/alexa)

The ASK CLI must be installed first with a valid AWS IAM account. There is more information in the [ASK CLI documentation](https://developer.amazon.com/en-US/docs/alexa/smapi/quick-start-alexa-skills-kit-command-line-interface.html).

The REST API service must be running with a valid HTTP URL. Take note of this URL and port, then, edit the `api.js` file to update the service URL. The file is located in:

```
./src/api/api.ts
```

Since all functionalities are bounded to a patient's data, it is required to use authentication. For account linking, there is a configuration file located in `./skill-package/account-linking.json`. It should be updated if using a different identity provider. 

Credentials are defined in `auth.ts`. These should also be set before deploying the skill.

More information in the [Alexa documentation](https://developer.amazon.com/en-US/docs/alexa/account-linking/configure-authorization-code-grant.html)

### Build the project

The project uses [esbuild](https://esbuild.github.io). Run these commands:

```bash
cd ./src
npm run build
```

### Deploying the project

With the ASK CLI correctly configured, run in the project's root folder:

```bash
ask deploy
```

Alternatively, build and deploy the project:

```bash
cd ./src && npm run build && cd ../
ask deploy
```

_Note:_ The project may require additional setup. There are more instructions in [Alexa's sample configurations](https://github.com/alexa/alexa-cookbook/blob/master/guides/cli/cli-hosted.md) 
