// Copyright 2016-2020, Pulumi Corporation.  All rights reserved.
import * as pulumi from "@pulumi/pulumi";
import * as tls from "@pulumi/tls";
import * as k8s from "@pulumi/kubernetes";
import * as sp from "./spotController";
import * as spot from "@pulumi/spotinst";
import * as containerservice from "@pulumi/azure-native/containerservice";
import * as resources from "@pulumi/azure-native/resources";
import * as random from "@pulumi/random";

const cfg = new pulumi.Config();

// Create an Azure Resource Group
const resourceGroup = new resources.ResourceGroup("demo-aks", {
    tags: {
        owner: "stack72",
        purpose: "demo-purposes"
    }
});

// Generate an SSH key
const sshKey = new tls.PrivateKey("ssh-key", {
    algorithm: "RSA",
    rsaBits: 4096,
});

const cluster = new containerservice.ManagedCluster("azure-aks", {
    resourceGroupName: resourceGroup.name,
    agentPoolProfiles: [{
        count: 1,
        mode: "System",
        name: "agentpool",
        vmSize: "Standard_DS2_v2",
    }],
    dnsPrefix: resourceGroup.name,
    kubernetesVersion: "1.21.1",
    networkProfile: {
        networkPlugin: "azure", // this enables an Azure CNI based cluster
    },
    linuxProfile: {
        adminUsername: "testuser",
        ssh: {
            publicKeys: [{
                keyData: sshKey.publicKeyOpenssh,
            }],
        },
    },
    identity: {
        type: "SystemAssigned"
    }
});

const creds = pulumi.all([cluster.name, resourceGroup.name]).apply(([clusterName, rgName]) => {
    return containerservice.listManagedClusterUserCredentials({
        resourceGroupName: rgName,
        resourceName: clusterName,
    });
});

const encoded = creds.kubeconfigs[0].value;
export const kubeconfig = encoded.apply(enc => Buffer.from(enc, "base64").toString());

const ks8Provider = new k8s.Provider("k8s-provider", {
    kubeconfig: encoded.apply(enc => Buffer.from(enc, "base64").toString()),
})

const controller = new sp.SpotController("demo", {
    clusterIdentifier: "ocean-westus-dev-aks",
    provider: ks8Provider
}, {
    dependsOn: [ks8Provider, cluster]
});

const ocean = new spot.azure.Ocean("ocean-aka", {
    controllerClusterId: controller.spotinstControllerId,
    acdIdentifier: controller.acdIdentifier,
    aksName: cluster.name,
    aksResourceGroupName: resourceGroup.name,
    sshPublicKey: sshKey.publicKeyOpenssh,
    userName: "testuser",
})

const vng = new spot.azure.OceanVirtualNodeGroup("ocean-vng", {
    oceanId: ocean.id,
    launchSpecifications: [{
        osDisk: {
            sizeGb: 200,
            type: "Standard_LRS",
        }
    }]
})
