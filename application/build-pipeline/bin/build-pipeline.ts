#!/usr/bin/env node
import "source-map-support/register";
import * as cdk from "@aws-cdk/core";
import { BuildPipelineStack } from "../lib/build-pipeline-stack";

const app = new cdk.App();
new BuildPipelineStack(app, "BuildPipelineStack");
