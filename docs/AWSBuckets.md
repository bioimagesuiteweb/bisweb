# Creating a New AWS Bucket

BioImageSuite Web is capable of reading files from a user's AWS Buckets, but configuring this properly requires a bit of setup. This document will explain the most efficient way to create an Amazon AWS account, set up your bucket, and configure it to work with BisWeb.

### Creating an AWS Account 

The first step to creating a bucket is to create an Amazon AWS account at [the following link](https://aws.amazon.com/console/). Click the 'Sign In to the Console' button at the top right then click 'Create a new AWS account' just below the blue 'Sign in' button. This will begin a tutorial that will guide you through the process of creating a new AWS Account. Bear in mind that this may require linking a credit card, though what BioImageSuite requires shouldn't exceed the free usage limits.

![](./AWSBucketsImages/AWSConsoleSignInButton.png)

![](./AWSBucketsImages/AWSCreateNewAWSAccountButton.png)
_Figure 1: The two screens you will see on your way to creating an AWS Account_

### Creating an S3 Bucket

Once you've created an AWS account, find S3 on the console's dashboard and click the link. 

![](./AWSBucketsImages/S3ConsoleScreen.png)
_Figure 2: The AWS Console with the S3 button highlighted._

Once in the main S3 menu, click the 'Create bucket' button and follow the prompts to configure your bucket. Note that BioImageSuite does not currently support encrypted buckets, but this may change in a future release. 

![](./AWSBucketsImages/S3BucketCreator.png)
_Figure 3: The 'Create Bucket' button and the prompt it will open._

Once the bucket is created you will need to set two properties to allow it to work BioImageSuite: the Bucket Policy and the CORS configuration.

<a name="bucket-policy"></a>
#### Bucket Policy

The bucket needs to be associated with the BioImageSuite application in order to be accessible from the web browser. This is done using [Amazon Cognito Identity Pools](https://docs.aws.amazon.com/cognito/latest/developerguide/cognito-user-identity-pools.html) to provide security and a unified authentication framework. 

We will have to create an Identity Pool associated with BioImageSuite for you. Once this is done, add the following lines to your bucket's Bucket Policy: 

    {
        "Version": "2012-10-17",
        "Statement": [
            {
                "Effect": "Allow",
                "Principal": {
                    "AWS": "arn:aws:iam::<ACCOUNT_ID>:role/<COGNITO_IDENTITY_POOL_AUTH_ROLE>"
                },
                "Action": "s3:ListBucket",
                "Resource": "arn:aws:s3:::<S3_BUCKET_NAME>"
            },
            {
                "Effect": "Allow",
                "Principal": {
                    "AWS": "arn:aws:iam::<ACCOUNT_ID>:role/<COGNITO_IDENTITY_POOL_AUTH_ROLE>"
                },
                "Action": [
                    "s3:GetObject",
                    "s3:PutObject",
                    "s3:DeleteObject"
                ],
                "Resource": "arn:aws:s3:::<S3_BUCKET_NAME>/*"
            }
        ]
    }

The parts of the policy surrounded by carats will need to be replaced by values relevant to your bucket and values specific to the BioImageSuite User Pools that cannot be published here. 

* <ACCOUNT_ID> designates the account id of the owner of the BioImageSuite app User Pool (contact Zach Saltzman for more information or to have your bucket added to S3). 

* <COGNITO_IDENTITY_POOL_AUTH_ROLE> designates the name of the authentication role that will be created along with your identity pool. See [the section about identity pools](#identity-pool) for more information.

* <S3_BUCKET_NAME> designates the name of your S3 bucket.

More information about what setting a Bucket Policy can do can be found in the [official S3 documentation](https://docs.aws.amazon.com/AmazonS3/latest/dev/using-iam-policies.html).


![](./AWSBucketsImages/BucketPolicyScreen.png)
_Figure 4: The bucket policy screen found under Permissions->Bucket Policy, with the Bucket Policy button and policy editor screen outlined in red. Note that the editor itself is blurred to hide certain information_

#### CORS Configuration

The Bucket Policy controls what resources external to S3 can access the bucket by authenticating users and specifying which users can do what. The CORS (Cross-Origin Resource Sharing) Configuration defines exceptions to a security policy known as the [Same Origin Policy](https://en.wikipedia.org/wiki/Same-origin_policy) that is common to all applications that live on the web. In essence, the Same Origin Policy dictates that applications from one webpage may not access data from applications in another webpage unless they originate from the same source. This would prevent BioImageSuite, which currently lives on a [Git Pages](https://pages.github.com/) serv<a name="identity-pool"></a>er, from accessing data that lives on the S3 servers. <a name="identity-pool"></a>
<a name="identity-pool"></a>
S3 buckets allow you to add exceptions<a name="identity-pool"></a> to the Same Origin Policy for trusted domains, which will allow BioI<a name="identity-pool"></a>mageSuite to access the data on your S3 bucket despite the fact that i<a name="identity-pool"></a>t has a different origin. The following schema will make your data a<a name="identity-pool"></a>ccessible: 
<a name="identity-pool"></a>
    <?xml version="1.0" encoding="UTF-<a name="identity-pool"></a>8"?>
    <CORSConfiguration xmlns="http://s3.amazonaws.com/doc/2006-03-01/">
    <CORSRule>
        <AllowedOrigin>http://localhost:8080</AllowedOrigin>
        <AllowedMethod>POST</AllowedMethod>
        <AllowedMethod>GET</AllowedMethod>
        <AllowedMethod>PUT</AllowedMethod>
        <AllowedMethod>DELETE</AllowedMethod>
        <AllowedMethod>HEAD</AllowedMethod>
        <ExposeHeader>ETag</ExposeHeader>
        <AllowedHeader>*</AllowedHeader>
    </CORSRule>
    <CORSRule>
        <AllowedOrigin>https://git.yale.edu</AllowedOrigin>
        <AllowedMethod>POST</AllowedMethod>
        <AllowedMethod>GET</AllowedMethod>
        <AllowedMethod>PUT</AllowedM<a name="identity-pool"></a>ethod>
        <AllowedMethod>DELETE</Allow<a name="identity-pool"></a>edMethod>
        <AllowedMethod>HEAD</Allowed<a name="identity-pool"></a>Method>
        <ExposeHeader>ETag</ExposeHe<a name="identity-pool"></a>ader>
        <AllowedHeader>*</AllowedHea<a name="identity-pool"></a>der>
    </CORSRule><a name="identity-pool"></a>
    </CORSConfiguration><a name="identity-pool"></<a name="identity-pool"></a>>
<a name="identity-pool"></a>
The `localhost` origin may be omitte<a name="ident<a name="identity-pool"></a>ty-pool"></a>d for users that are not interested in hosting the appli<a name="identity-pool"></a>ation on their <a name="identity-pool"></a>own machine. 
<a name="identity-pool"></a>
The last step is to create an identity pool associ<a name="identity-pool"></a>ted with both the BioImageSuite User Pool and your S3 bucket. 


![](./AWSBucketsImages/AWSCORSEditor.png)
_Figure 5: The CORS Editor screen, accessible through Preferences->CORS Configuration from the S3 dashboard._

<a name="identity-pool"></a>
### Identity Pool

An Identity Pool associates a particular account with a particular application and provides credentials to allow its users authenticated access to its resources. In this case, your Identity Pool will allow BioImageSuite to know that it's you or another authenticated person attempting to access resources in your bucket. 

Start by finding the Cognito item in the Amazon AWS dashboard (the screen that displays when you log into the Amazon AWS console), then select 'Manage Identity Pools' once inside. 


![](./AWSBucketsImages/CognitoSelection.png)
_Figure 6: The Amazon Cognito menu item on the dashboard (located all the way down the page)._


![](./AWSBucketsImages/CognitoIdentityPoolScreen.png)
_Figure 7: The Amazon Cognito main menu._

Create your Identity Pool selecting Cognito as the identity provider. For the User Pool ID, enter the BioImageSuite User Pool ID (us-east-1_BAOsizFzq) and App Client ID (5edh465pitl9rb04qbi37csv8e). This will associate your identity pool with BioImageSuite.


![](./AWSBucketsImages/IdentityPoolPage.png)
_Figure 8: The identity pool creation page with the relevant authentication provider sections highlighted._

The last step is to create your authentication roles, [which are referenced in the Bucket Policy](#bucket-policy). These names can be anything you'd like but it's recommended to leave the defaults. Note that BioImageSuite uses only the authenticated role, not the unauthenticated role.


![](./AWSBucketsImages/IdentityPoolRolePage.png)
_Figure 9: The Identity Pool role page, with the relevant role highlighted in red._


### Conclusion

Once these steps are complete your bucket may be accessed through the AWS Bucket Selector within BioImageSuite. This will require you to enter your Identity Pool ID and Bucket Name the first time you add the bucket, but these settings will be retained in the browser cache afterwards. Happy processing!


![](./AWSBucketsImages/AWSSelector.png)
_Figure 10: The BioImageSuite AWS Bucket selector, accessible through Help->AWS Selector_


### Appendices

#### Appendix A: Finding your Identity Pool ID

All AWS resources have a unique identifier associated with them. You will need the ID of your identity pool in order for BioImageSuite to be able to access resources associated with your account. 

The first step is to go to the AWS dashboard find your list of Identity Pools (see [the section on Identity Pools](#identity-pool) for more details). Once inside the dashboard, find your Identity Pool that corresponds to BioImageSuite and go to its settings. The Identity Pool ID should be listed there.


![](./AWSBucketsImages/IdentityPoolSelection.png)
_Figure 11: The Identity Pool Selection Screen. If, for example, "bisweb test identity pool 2" was the Identity Pool associated with your S3 Bucket, this would be where you click._


![](./AWSBucketsImages/EditIdentityPool.png)
_Figure 12: The dashboard for an Identity Pool and where to click to display its settings._


![](./AWSBucketsImages/IdentityPoolIDScreen.png)
_Figure 13: Where to find the ID associated with the Identity Pool. Note that this one has been blurred out, but yours will be here._