import { Construct } from "constructs";
import { Fn } from "aws-cdk-lib";

import * as ec2 from "aws-cdk-lib/aws-ec2";
import * as ecs from "aws-cdk-lib/aws-ecs";
import * as sd from "aws-cdk-lib/aws-servicediscovery";

export class Platform extends Construct {
  public sharedVpc: ec2.IVpc;
  public ecsCluster: ecs.ICluster;
  public sharedSecGrp3000: ec2.ISecurityGroup;

  constructor(scope: Construct, id: string) {
    super(scope, id);

    const deployEnv = this.node.tryGetContext("deployEnv") ?? "dev";

    this.sharedVpc = ec2.Vpc.fromLookup(this, "ClusterVPC", {
      vpcName: `ecsworkshop-${deployEnv}`,
    });

    this.ecsCluster = ecs.Cluster.fromClusterAttributes(this, "ClusterDemo", {
      clusterName: Fn.importValue(`clusterName-${deployEnv}`),
      securityGroups: [],
      vpc: this.sharedVpc,
      defaultCloudMapNamespace:
        sd.PrivateDnsNamespace.fromPrivateDnsNamespaceAttributes(
          this,
          "ClusterNamespace",
          {
            namespaceArn: Fn.importValue(`cloudMapArn-${deployEnv}`),
            namespaceId: Fn.importValue(`cloudMapId-${deployEnv}`),
            namespaceName: Fn.importValue(`cloudMapName-${deployEnv}`),
          }
        ),
    });

    this.sharedSecGrp3000 = ec2.SecurityGroup.fromSecurityGroupId(
      this,
      "SharedSvcSecGrp3000",
      Fn.importValue(`sharedSvcSecurityGroup3000-${deployEnv}`)
    );
  }
}
