import * as pulumi from "@pulumi/pulumi";
import * as k8s from "@pulumi/kubernetes";
import * as random from "@pulumi/random";

export interface SpotControllerArgs {
    clusterIdentifier: string,
    provider: k8s.Provider;
}

export class SpotController extends pulumi.ComponentResource {
    acdIdentifier: pulumi.Output<string>;
    spotinstControllerId: string;
    constructor(name: string,
                args: SpotControllerArgs,
                opts: pulumi.ComponentResourceOptions = {}) {
        super("spot:demo:SpotController", name, args, opts);

        const namespace = "kube-system"
        const namePrefix = "spotinst-kubernetes-cluster-controller"

        const spotToken = process.env.SPOTINST_TOKEN || "";
        let spotTokenEnc = new Buffer(spotToken).toString('base64');

        const spotAccount = process.env.SPOTINST_ACCOUNT || "";
        let spotAccountEnc = new Buffer(spotAccount).toString('base64');

        const controlSecret = new k8s.core.v1.Secret(`${name}-secret`, {
            metadata: {
                name: namePrefix,
                namespace: namespace,
            },
            type: "Opaque",
            data: {
                "token": spotTokenEnc,
                "account": spotAccountEnc,
            },
        }, {
            provider: args.provider,
            parent: this,
        })

        const configMap = new k8s.core.v1.ConfigMap(`${name}-configMap`, {
            metadata: {
                name: namePrefix + "-config",
                namespace: namespace,
            },
            data: {
                "spotinst.cluster-identifier": args.clusterIdentifier,
                "base-url": "",
                "proxy-url": "",
                "enable-csr-approval": "true",
                "disable-auto-update": "true",
            },
        }, {
            provider: args.provider,
            parent: this,
        })

        this.spotinstControllerId = args.clusterIdentifier

        const serviceAccount = new k8s.core.v1.ServiceAccount(`${name}-service-account`, {
            metadata: {
                name: namePrefix,
                namespace: namespace,
            },
            automountServiceAccountToken: true,
        }, {
            provider: args.provider,
            parent: this,
        })

        const clusterRole = new k8s.rbac.v1.ClusterRole(`${name}-cluster-role`, {
            metadata: {
                name: namePrefix,
                namespace: namespace,
            },
            rules: [
                // ------------------------------
                //    # feature: ocean/readonly
                // ------------------------------
                {
                    apiGroups: [""],
                    resources: ["pods", "nodes", "services", "namespaces", "replicationcontrollers", "limitranges", "events", "persistentvolumes", "persistentvolumeclaims"],
                    verbs: ["get", "list"],
                },
                {
                    apiGroups: ["apps"],
                    resources: ["deployments", "daemonsets", "statefulsets", "replicasets"],
                    verbs: ["get", "list"],
                },
                {
                    apiGroups:["storage.k8s.io"],
                    resources: ["storageclasses"],
                    verbs: ["get", "list"]
                },
                {
                    apiGroups: ["batch"],
                    resources: ["jobs"],
                    verbs: ["get", "list"],
                },
                {
                    apiGroups: ["extensions"],
                    resources: ["replicasets", "daemonsets"],
                    verbs: ["get", "list"],
                },
                {
                    apiGroups: ["policy"],
                    resources: ["poddisruptionbudgets"],
                    verbs: ["get", "list"],
                },
                {
                    apiGroups: ["metrics.k8s.io"],
                    resources: ["pods"],
                    verbs: ["get", "list"],
                },
                {
                    apiGroups: ["autoscaling"],
                    resources: ["horizontalpodautoscalers"],
                    verbs: ["get", "list"],
                },
                {
                    apiGroups: ["apiextensions.k8s.io"],
                    resources: ["customresourcedefinitions"],
                    verbs: ["get", "list"],
                },
                {
                    nonResourceURLs: ["/version/", "/version"],
                    verbs: ["get"],
                },
                // ------------------------------
                //    # feature: ocean/draining
                // ------------------------------
                {
                    apiGroups: [""],
                    resources: ["nodes"],
                    verbs: ["patch", "update"],
                },
                {
                    apiGroups: [""],
                    resources: ["pods"],
                    verbs: ["delete"],
                },
                {
                    apiGroups: [""],
                    resources: ["pods/eviction"],
                    verbs: ["create"],
                },
                // ------------------------------
                //    # feature: ocean/cleanup
                // ------------------------------
                {
                    apiGroups: [""],
                    resources: ["nodes"],
                    verbs: ["delete"],
                },
                // -----------------------------------
                //    # feature: ocean/csr-approval
                // -----------------------------------
                {
                    apiGroups: ["certificates.k8s.io"],
                    resources: ["certificatesigningrequests"],
                    verbs: ["get", "list", "create", "delete"],
                },
                {
                    apiGroups: ["certificates.k8s.io"],
                    resources: ["certificatesigningrequests/approval"],
                    verbs: ["patch", "update"],
                },
                {
                    apiGroups: ["certificates.k8s.io"],
                    resources: ["signers"],
                    resourceNames: ["kubernetes.io/kubelet-serving", "kubernetes.io/kube-apiserver-client-kubelet"],
                    verbs: ["approve"],
                },
                // -----------------------------------
                //    # feature: ocean/auto-update
                // -----------------------------------
                {
                    apiGroups: ["rbac.authorization.k8s.io"],
                    resources: ["clusterroles"],
                    resourceNames: [namePrefix],
                    verbs: ["patch", "update", "escalate"],
                },
                {
                    apiGroups: ["apps"],
                    resources: ["deployments"],
                    resourceNames: [namePrefix],
                    verbs: ["patch", "update"],
                },
                // -----------------------------------
                //    # feature: ocean/apply
                // -----------------------------------
                {
                    apiGroups: ["apps"],
                    resources: ["deployments", "daemonsets"],
                    verbs: ["get", "list", "patch", "update", "create", "delete"],
                },
                {
                    apiGroups: ["extensions"],
                    resources: ["daemonsets"],
                    verbs: ["get", "list", "patch", "update", "create", "delete"],
                },
                {
                    apiGroups: [""],
                    resources: ["pods"],
                    verbs: ["get", "list", "patch", "update", "create", "delete"],
                },
                {
                    apiGroups: ["batch"],
                    resources: ["jobs"],
                    verbs: ["get", "list", "patch", "update", "create", "delete"],
                },
                // -----------------------------------
                //    # feature: ocean/wave
                // -----------------------------------
                {
                    apiGroups: ["sparkoperator.k8s.io"],
                    resources: ["sparkapplications", "scheduledsparkapplications"],
                    verbs: ["get", "list", "create"],
                },
                {
                    apiGroups: ["wave.spot.io"],
                    resources: ["sparkapplications", "wavecomponents", "waveenvironments"],
                    verbs: ["get", "list"],
                },
                {
                    apiGroups: ["bigdata.spot.io"],
                    resources: ["bigdataenvironments"],
                    verbs: ["get", "list"],
                }
            ],
        }, {
            provider: args.provider,
            parent: this,
        });

        const clusterRoleBinding = new k8s.rbac.v1.ClusterRoleBinding(`${name}-cluster-role-binding`,  {
            metadata: {
                name: namePrefix,
            },
            roleRef: {
                apiGroup: "rbac.authorization.k8s.io",
                kind: "ClusterRole",
                name: clusterRole.metadata.name,
            },
            subjects: [
                {
                    apiGroup: "",
                    kind: "ServiceAccount",
                    name: serviceAccount.metadata.name,
                    namespace: serviceAccount.metadata.namespace,
                }
            ]
        }, {
            provider: args.provider,
            parent: this,
        })

        const deployment = new k8s.apps.v1.Deployment(`${name}-deployment`, {
            metadata: {
                name: namePrefix,
                namespace: namespace,

                labels: {
                    'k8s-app': namePrefix,
                }
            },
            spec: {
                replicas: 1,
                revisionHistoryLimit: 10,
                selector: {
                    matchLabels: {
                        'k8s-app': namePrefix,
                    },
                },
                template: {
                    metadata: {
                        labels: {
                            'k8s-app': namePrefix,
                        },
                    },
                    spec: {
                       priorityClassName: "system-cluster-critical",
                        affinity: {
                           nodeAffinity: {
                               requiredDuringSchedulingIgnoredDuringExecution: {
                                   nodeSelectorTerms: [{
                                       matchExpressions: [{
                                            key: "kubernetes.io/os",
                                           operator: "NotIn",
                                           values: ["windows"]
                                       }],
                                   }],
                               },
                               preferredDuringSchedulingIgnoredDuringExecution: [{
                                   weight: 100,
                                   preference: {
                                       matchExpressions: [{
                                           key: "node-role.kubernetes.io/master",
                                           operator: "Exists"
                                       }]
                                   }
                               }],
                           },
                           podAffinity: {
                               preferredDuringSchedulingIgnoredDuringExecution: [{
                                   weight: 100,
                                   podAffinityTerm: {
                                       topologyKey: "kubernetes.io/hostname",
                                       labelSelector: {
                                           matchExpressions: [{
                                               key: "k8s-app",
                                               operator: "In",
                                               values: [namePrefix]
                                           }]
                                       }
                                   }
                               }]
                           }
                        },
                        containers: [{
                            image: "gcr.io/spotinst-artifacts/kubernetes-cluster-controller:1.0.78",
                            name: namePrefix,
                            imagePullPolicy: "Always",

                            livenessProbe: {
                               httpGet: {
                                   path: "/healthcheck",
                                   port: 4401
                               },
                                initialDelaySeconds: 300,
                                periodSeconds: 20,
                                timeoutSeconds: 2,
                                successThreshold: 1,
                                failureThreshold: 3,
                            },

                            readinessProbe: {
                                httpGet: {
                                    path: "/healthcheck",
                                    port: 4401
                                },
                                initialDelaySeconds: 20,
                                periodSeconds: 20,
                                timeoutSeconds: 2,
                                successThreshold: 1,
                                failureThreshold: 3,
                            },

                            env: [
                                {
                                    name: "SPOTINST_ACCOUNT",
                                    valueFrom: {
                                        secretKeyRef: {
                                            name: controlSecret.metadata.name,
                                            key: "account",
                                            optional: true,
                                        }
                                    },
                                },
                                {
                                    name: "SPOTINST_TOKEN",
                                    valueFrom: {
                                        secretKeyRef: {
                                            name: controlSecret.metadata.name,
                                            key: "token",
                                            optional: true,
                                        }
                                    },
                                },
                                {
                                    name: "CLUSTER_IDENTIFIER",
                                    valueFrom: {
                                        configMapKeyRef: {
                                            name: configMap.metadata.name,
                                            key: "spotinst.cluster-identifier",
                                        }
                                    }
                                },
                                {
                                    name: "ENABLE_CSR_APPROVAL",
                                    valueFrom: {
                                        configMapKeyRef: {
                                            name: configMap.metadata.name,
                                            key: "enable-csr-approval",
                                        }
                                    }
                                },
                                {
                                    name: "DISABLE_AUTO_UPDATE",
                                    valueFrom: {
                                        configMapKeyRef: {
                                            name: configMap.metadata.name,
                                            key: "disable-auto-update",
                                        }
                                    }
                                },
                                {
                                    name: "POD_ID",
                                    valueFrom: {
                                        fieldRef: {
                                            fieldPath: "metadata.uid",
                                        }
                                    }
                                },
                                {
                                    name: "POD_NAME",
                                    valueFrom: {
                                        fieldRef: {
                                            fieldPath: "metadata.name",
                                        }
                                    }
                                },
                                {
                                    name: "POD_NAMESPACE",
                                    valueFrom: {
                                        fieldRef: {
                                            fieldPath: "metadata.namespace",
                                        }
                                    }
                                },
                            ],
                        }],
                        serviceAccountName: serviceAccount.metadata.name,
                        automountServiceAccountToken: true,
                        dnsPolicy: "Default",
                        tolerations: [
                            {
                                effect: "NoExecute",
                                key: "node.kubernetes.io/not-ready",
                                operator: "Exists",
                                tolerationSeconds: 150,
                            },
                            {
                                effect: "NoExecute",
                                key: "node.kubernetes.io/unreachable",
                                operator: "Exists",
                                tolerationSeconds: 150,
                            },
                            {
                                key: "node-role.kubernetes.io/master",
                                operator: "Exists",
                            },
                        ]
                    },
                },
            },
        }, {
            provider: args.provider,
            parent: this,
        });

        const randomIdentifier = new random.RandomPet("identifier-name", {
            prefix: "acd-",
            length: 1,
        })

        this.acdIdentifier = randomIdentifier.id

        const job = new k8s.batch.v1.Job(`${name}-job`, {
            metadata: {
                name: namePrefix + "-aks-connector",
                namespace: namespace,

                labels: {
                    'k8s-app': namePrefix + "-aks-connector",
                }
            },
            spec: {
                template: {
                    spec: {
                        nodeSelector: {
                            'kubernetes.azure.com/mode': "system",
                        },
                        containers: [{
                            image: "spotinst/ocean-aks-connector:1.0.8",
                            name: "ocean-aks-connector",
                            imagePullPolicy: "Always",
                            args: ["connect-ocean"],
                            env: [
                                {
                                    name: "SPOT_TOKEN",
                                    valueFrom: {
                                        secretKeyRef: {
                                            name: controlSecret.metadata.name,
                                            key: "token",
                                        }
                                    }
                                },
                                {
                                    name: "SPOT_ACCOUNT",
                                    valueFrom: {
                                        secretKeyRef: {
                                            name: controlSecret.metadata.name,
                                            key: "account",
                                        }
                                    }
                                },
                                {
                                    name: "SPOT_CLUSTER_IDENTIFIER",
                                    valueFrom: {
                                        configMapKeyRef: {
                                            name: configMap.metadata.name,
                                            key: "spotinst.cluster-identifier",
                                        }
                                    }
                                },
                                {
                                    name: "SPOT_ACD_IDENTIFIER",
                                    value: this.acdIdentifier,
                                },
                            ],
                            securityContext: {
                                allowPrivilegeEscalation: false,
                                runAsUser: 0
                            },
                            volumeMounts: [{
                                name: "waagent",
                                mountPath: "/var/lib/waagent"
                            }]
                        }],
                        volumes: [{
                            name: "waagent",
                            hostPath: {
                                type: "Directory",
                                path: "/var/lib/waagent",
                            }
                        }],
                        dnsPolicy: "Default",
                        restartPolicy: "Never",
                    },
                },
            },
        }, {
            provider: args.provider,
            parent: this,
        })

        this.registerOutputs({});
    }
}
