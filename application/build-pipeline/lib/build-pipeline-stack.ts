import * as cdk from "@aws-cdk/core";
import * as pipelines from "@aws-cdk/pipelines";
import * as ecr from "aws-cdk/aws-ecr";

class MyPipelineStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    const pipeline = new CodePipeline(this, "Pipeline", {
      synth: new ShellStep("Synth", {
        // Use a connection created using the AWS console to authenticate to GitHub
        // Other sources are available.
        input: CodePipelineSource.connection("my-org/my-app", "main", {
          connectionArn:
            "arn:aws:codestar-connections:us-east-1:222222222222:connection/7d2469ff-514a-4e4f-9003-5ca4a43cdc41", // Created using the AWS console * });',
        }),
        commands: ["npm ci", "npm run build", "npx cdk synth"],
      }),
    });

    // 'MyApplication' is defined below. Call `addStage` as many times as
    // necessary with any account and region (may be different from the
    // pipeline's).
    pipeline.addStage(
      new MyApplication(this, "Prod", {
        env: {
          account: "123456789012",
          region: "eu-west-1",
        },
      })
    );
  }
}

class BuildPipelineStack extends cdk.Stage {
  constructor(scope: cdk.Construct, id: string, props?: cdk.StageProps) {
    super(scope, id, props);
  }
}
