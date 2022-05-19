import { App } from "aws-cdk-lib";
import { ECSDemoNodeJs } from "../lib/backend";

// for development, use account/region from cdk cli
const devEnv = {
  account: process.env.CDK_DEFAULT_ACCOUNT,
  region: process.env.CDK_DEFAULT_REGION,
};

const app = new App();

new ECSDemoNodeJs(app, "ecsworkshop-nodejs", { env: devEnv });

app.synth();
