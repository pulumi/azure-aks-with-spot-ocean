[![Deploy](https://get.pulumi.com/new/button.svg)](https://app.pulumi.com/new)

# Autoscaling Azure AKS With Spot Ocean

This example demonstrates creating an Azure Kubernetes Service (AKS) Cluster, importing that cluster into Spot Ocean AKS
management and deploying an application into it to watch the fact that Spot manages the autoscaling aspect of the cluster,
Please see https://docs.microsoft.com/en-us/azure/aks/ for more information about AKS and https://spot.io/products/ocean/ for
more information about Spot Ocean.

## Prerequisites

Ensure you have [downloaded and installed the Pulumi CLI](https://www.pulumi.com/docs/get-started/install/).

We will be deploying to Azure, so you will need an Azure account. If you don't have an account,
[sign up for free here](https://azure.microsoft.com/en-us/free/).
[Follow the instructions here](https://www.pulumi.com/docs/intro/cloud-providers/azure/setup/) to connect Pulumi to your Azure account.

We will also be managaging our Azure AKS Cluster via Spot. If you don't have an account then  
[sign up for free here](https://console.spotinst.com/spt/auth/signUp). Follow our 
[Spot Setup Instructions here](https://www.pulumi.com/docs/intro/cloud-providers/spotinst/setup/) in order to be able to interact with Spot.

In addition you will need the following CLI tools:

```
$ az --version # Azure CLI
azure-cli                         2.24.1
core                              2.24.1 
telemetry                          1.0.6
...

$ npm --version # Node.js Package Manager
6.14.13

$ tsc --version # TypeScript compiler
Version 4.3.5
```

## Running the Example

After cloning this repo, `cd` into the `infrastructure` folder and run these commands. A Kubernetes cluster!

1. Login to your Azure account:

    ```bash
    $ az login
    ```

2. Download nodejs dependencies:

    ```bash
    $ npm install
    ```

3. Create a new stack, which is an isolated deployment target for this example:

    ```bash
    $ pulumi stack init
    ```

4. Set the required configuration variables for this program:

    ```bash
    $ pulumi config set azure-native:location westus
    ```

5. Deploy everything with the `pulumi up` command. This provisions all the Azure resources necessary, deploys the 
   Spot Controller into the Kubernetes cluster and then deploys a Spot Ocean and Spot Virtual Node Group and all in a single gesture:

    ```bash
    $ pulumi up
    ```

6. After a couple minutes, your cluster and Spot will be ready. Kubernetes config (`kubeConfig`) will be printed.

   You can test your cluster configuration using `kubectl` and the `kubeConfig` configuration:

   ```bash
   $ pulumi stack output kubeconfig --show-secrets > kubeconfig.yaml
   $ KUBECONFIG=./kubeconfig.yaml kubectl get service
   NAME            TYPE           CLUSTER-IP     EXTERNAL-IP    PORT(S)                      AGE
   kubernetes      ClusterIP      10.0.0.1       <none>         443/TCP                      13h
   ```

7. At this point, you have a running cluster. Feel free to modify your program, and run `pulumi up` to redeploy changes.
   The Pulumi CLI automatically detects what has changed and makes the minimal edits necessary to accomplish these
   changes. This could be altering the existing chart, adding new Azure or Kubernetes resources, or anything, really.

8. As you now have a cluster and a kubeconfig, you can now deploy a set of sample applications into the cluster to be
   able to show the autoscaling aspect of Spot Ocean. 

   ```bash
   $ cd ../sample-infrastrucute
   $ pulumi up
   ```

9. Once you are done, you can destroy all of the resources, and the stack:

      ```bash
      $ pulumi destroy
      $ pulumi stack rm
      ```
