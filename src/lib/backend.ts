import { Stack, StackProps } from "aws-cdk-lib";
import { Construct } from "constructs";
import { ECSService } from "./ecs-service";

export class ECSDemoNodeJs extends Stack {
  constructor(scope: Construct, id: string, props: StackProps = {}) {
    super(scope, id, props);

    new ECSService(this, "ECSWorkshopNodeJs", { containerPort: 3000 });
  }
}
