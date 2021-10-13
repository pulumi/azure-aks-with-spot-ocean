import * as k8s from "@pulumi/kubernetes";

const name = "helloworld";

const ns = new k8s.core.v1.Namespace(name);

const appLabels = { app: "nginx" };
const deployment = new k8s.apps.v1.Deployment("nginx", {
    metadata: {
        namespace: ns.metadata.name,
        labels: appLabels,
    },
    spec: {
        selector: { matchLabels: appLabels },
        replicas: 1,
        template: {
            metadata: { labels: appLabels },
            spec: {
                containers: [
                    {
                        name: "nginx",
                        image: "nginx",
                        resources: {
                            requests: {
                                memory: "6Gi",
                                // cpu: "2000m",
                            },
                        },
                    },
                ],
            }
        }
    }
});

const deploymentWithNodeSelector = new k8s.apps.v1.Deployment("nginx-with-node-selector", {
    metadata: {
        namespace: ns.metadata.name,
        labels: appLabels,
    },
    spec: {
        selector: { matchLabels: appLabels },
        replicas: 1,
        template: {
            metadata: { labels: appLabels },
            spec: {
                nodeSelector: {
                    "node.kubernetes.io/instance-type": "Standard_DS2_v2",
                },
                containers: [
                    {
                        name: "nginx",
                        image: "nginx",
                    },
                ],
            }
        }
    }
});
