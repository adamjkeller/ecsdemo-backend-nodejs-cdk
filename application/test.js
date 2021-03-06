"use strict";
const aws = require("aws-sdk");
let defaultResponseURL, defaultLogGroup, defaultLogStream;
const updateStackWaiter = { delay: 30, maxAttempts: 29 },
  AliasParamKey = "Aliases";
let report = function (a, b, c, d, e, f) {
  return new Promise((g, h) => {
    const i = require("https"),
      { URL: j } = require("url");
    var k = JSON.stringify({
      Status: c,
      Reason: f,
      PhysicalResourceId: d || b.logStreamName,
      StackId: a.StackId,
      RequestId: a.RequestId,
      LogicalResourceId: a.LogicalResourceId,
      Data: e,
    });
    const l = new j(a.ResponseURL || defaultResponseURL),
      m = {
        hostname: l.hostname,
        port: 443,
        path: l.pathname + l.search,
        method: "PUT",
        headers: { "Content-Type": "", "Content-Length": k.length },
      };
    i.request(m)
      .on("error", h)
      .on("response", (a) => {
        a.resume(),
          400 <= a.statusCode
            ? h(new Error(`Error ${a.statusCode}: ${a.statusMessage}`))
            : g();
      })
      .end(k, "utf8");
  });
};
const controlEnv = async function (a, b, c, d) {
  var e = new aws.CloudFormation();
  for (c = c || [], d = d || []; ; ) {
    var f = await e.describeStacks({ StackName: a }).promise();
    if (1 !== f.Stacks.length)
      throw new Error(`Cannot find environment stack ${a}`);
    const g = f.Stacks[0],
      h = JSON.parse(JSON.stringify(g.Parameters)),
      i = setOfParameterKeysWithWorkload(h, b),
      j = new Set(d.filter((a) => a.endsWith("Workloads"))),
      k = [...i].filter((a) => !j.has(a)),
      l = [...j].filter((a) => !i.has(a)),
      m = getExportedValues(g),
      n = needUpdateAliases(h, b, c);
    if (0 === k.length + l.length && !n) return m;
    for (const a of h) {
      if (a.ParameterKey === AliasParamKey) {
        n && (a.ParameterValue = updateAliases(a.ParameterValue, b, c));
        continue;
      }
      if (k.includes(a.ParameterKey)) {
        const c = new Set(a.ParameterValue.split(",").filter(Boolean));
        c.delete(b), (a.ParameterValue = [...c].join(","));
      }
      if (l.includes(a.ParameterKey)) {
        const c = new Set(a.ParameterValue.split(",").filter(Boolean));
        c.add(b), (a.ParameterValue = [...c].join(","));
      }
    }
    try {
      await e
        .updateStack({
          StackName: a,
          Parameters: h,
          UsePreviousTemplate: !0,
          RoleARN: m.CFNExecutionRoleARN,
          Capabilities: g.Capabilities,
        })
        .promise();
    } catch (b) {
      if (
        !b.message.match(
          /^Stack.*is in UPDATE_IN_PROGRESS state and can not be updated/
        )
      )
        throw b;
      await e
        .waitFor("stackUpdateComplete", {
          StackName: a,
          $waiter: updateStackWaiter,
        })
        .promise();
      continue;
    }
    if (
      (await e
        .waitFor("stackUpdateComplete", {
          StackName: a,
          $waiter: updateStackWaiter,
        })
        .promise(),
      (f = await e.describeStacks({ StackName: a }).promise()),
      1 !== f.Stacks.length)
    )
      throw new Error(`Cannot find environment stack ${a}`);
    return getExportedValues(f.Stacks[0]);
  }
};
exports.handler = async function (a, b) {
  var c = {};
  const d = a.ResourceProperties,
    e = a.PhysicalResourceId || `envcontoller/${d.EnvStack}/${d.Workload}`;
  try {
    switch (a.RequestType) {
      case "Create":
        c = await Promise.race([
          exports.deadlineExpired(),
          controlEnv(d.EnvStack, d.Workload, d.Aliases, d.Parameters),
        ]);
        break;
      case "Update":
        c = await Promise.race([
          exports.deadlineExpired(),
          controlEnv(d.EnvStack, d.Workload, d.Aliases, d.Parameters),
        ]);
        break;
      case "Delete":
        c = await Promise.race([
          exports.deadlineExpired(),
          controlEnv(d.EnvStack, d.Workload, []),
        ]);
        break;
      default:
        throw new Error(`Unsupported request type ${a.RequestType}`);
    }
    await report(a, b, "SUCCESS", e, c);
  } catch (c) {
    console.log(`Caught error ${c}.`),
      console.log(`Responding FAILED for physical resource id: ${e}`),
      await report(
        a,
        b,
        "FAILED",
        e,
        null,
        `${c.message} (Log: ${defaultLogGroup || b.logGroupName}/${
          defaultLogStream || b.logStreamName
        })`
      );
  }
};
function setOfParameterKeysWithWorkload(a, b) {
  const c = new Set();
  return (
    a.forEach((a) => {
      if (a.ParameterKey.endsWith("Workloads")) {
        let d = new Set(a.ParameterValue.split(","));
        d.has(b) && c.add(a.ParameterKey);
      }
    }),
    c
  );
}
function needUpdateAliases(a, b, c) {
  for (const d of a) {
    if (d.ParameterKey !== AliasParamKey) continue;
    let a = JSON.parse(d.ParameterValue || "{}");
    if ((a[b] || []).toString() !== c.toString()) return !0;
  }
  return !1;
}
const updateAliases = function (a, b, c) {
    let d = JSON.parse(a || "{}");
    d[b] = 0 === c.length ? void 0 : c;
    const e = JSON.stringify(d);
    return "{}" === e ? "" : e;
  },
  getExportedValues = function (a) {
    const b = {};
    return (
      a.Outputs.forEach((a) => {
        b[a.OutputKey] = a.OutputValue;
      }),
      b
    );
  };
(exports.deadlineExpired = function () {
  return new Promise(function (a, b) {
    setTimeout(
      b,
      870000,
      new Error("Lambda took longer than 14.5 minutes to update environment")
    );
  });
}),
  (exports.withDefaultResponseURL = function (a) {
    defaultResponseURL = a;
  }),
  (exports.withDefaultLogStream = function (a) {
    defaultLogStream = a;
  }),
  (exports.withDefaultLogGroup = function (a) {
    defaultLogGroup = a;
  });
