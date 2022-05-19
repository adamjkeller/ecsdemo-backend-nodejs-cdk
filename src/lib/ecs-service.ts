import { Construct } from "constructs";
import { Duration, RemovalPolicy, Stack } from "aws-cdk-lib";
import { Platform } from "./platform";

import * as ecs from "aws-cdk-lib/aws-ecs";
import * as iam from "aws-cdk-lib/aws-iam";
import * as logs from "aws-cdk-lib/aws-logs";

export interface ECSServiceProps {
  containerPort: number;
  cpu?: number;
  memoryReservation?: number;
  enableServiceMesh?: boolean;
}

export class ECSService extends Construct {
  constructor(scope: Construct, id: string, props: ECSServiceProps) {
    super(scope, id);

    const platform = new Platform(this, "backend-nodejs");

    const deployEnv = this.node.tryGetContext("deployEnv") ?? "dev";

    const taskLogGroup = new logs.LogGroup(this, "NodeJsLogGroup", {
      removalPolicy: RemovalPolicy.DESTROY,
      retention: logs.RetentionDays.THREE_DAYS,
    });

    const nodeJsTaskDef = new ecs.TaskDefinition(this, "NodeJsTaskDefinition", {
      compatibility: ecs.Compatibility.EC2_AND_FARGATE,
      cpu: props.cpu?.toString() ?? "256",
      memoryMiB: props.memoryReservation?.toString() ?? "512",
    });

    nodeJsTaskDef.addContainer("NodeJsBackend", {
      image: ecs.ContainerImage.fromAsset("./application"),
      logging: ecs.LogDriver.awsLogs({
        streamPrefix: `ecsworkshop-nodejs-${deployEnv}`,
        logGroup: taskLogGroup,
      }),
      environment: {
        REGION: Stack.of(this).region,
      },
      portMappings: [
        {
          containerPort: 3000,
        },
      ],
      memoryReservationMiB: props.memoryReservation ?? 512,
    });

    const nodejsFargateService = new ecs.FargateService(this, "NodeJsService", {
      serviceName: `ecsworkshop-nodejs-${deployEnv}`,
      taskDefinition: nodeJsTaskDef,
      cluster: platform.ecsCluster,
      securityGroups: [platform.sharedSecGrp3000],
      cloudMapOptions: {
        name: "ecsdemo-nodejs",
      },
    });

    nodejsFargateService.taskDefinition.taskRole.addToPrincipalPolicy(
      new iam.PolicyStatement({
        actions: ["ec2:DescribeSubnets"],
        resources: ["*"],
      })
    );

    const autoScale = nodejsFargateService.autoScaleTaskCount({
      minCapacity: 1,
      maxCapacity: 5,
    });

    autoScale.scaleOnCpuUtilization("NodeJsAutoscaling", {
      targetUtilizationPercent: 60,
      scaleInCooldown: Duration.seconds(3),
      scaleOutCooldown: Duration.seconds(3),
    });
  }
}
