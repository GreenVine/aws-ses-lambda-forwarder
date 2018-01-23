# aws-ses-lambda-forwarder

A [AWS Lambda](https://aws.amazon.com/lambda) function written in Typescript that forwards all inbound [SES](https://aws.amazon.com/ses) emails to specific email addresses.

## Installation

- Development: Run `yarn serve`;
- Release & Package: Run `yarn release` and the generated file will be saved in `/releases` folder (**zip** needs to be installed globally)

## Configuration

Before running the forwarder in Lambda, Choose `Node.js 6.x` as the Runtime, and set `build.handler` as the Handler.

In addition, there're several environment variables need to be configured:

| Name                   	| Description                                                              	| Required? 	|    Default Value   	|
|------------------------	|--------------------------------------------------------------------------	|:---------:	|:------------------:	|
| S3_BUCKET              	| S3 bucket name to retrieve SES emails from                               	|    Yes    	|          -         	|
| S3_OBJECT_PREFIX       	| S3 object prefix defined in SES                                          	|     No    	|       (Empty)      	|
| MAILER_FROM_NAME       	| Display name of the sender ("forwarder")                                 	|     No    	|  "Email Forwarder" 	|
| MAILER_FROM_ADDRESS    	| From address that verified in SES                                        	|    Yes    	|          -         	|
| MAILER_TO_ADDRESS      	| Email address(es) that forward email to, separated by comma              	|    Yes    	|          -         	|
| MAILER_BCC_ADDRESS     	| Email address(es) that BCC email to, separated by comma                  	|     No    	|       (Empty)      	|
| MAILER_ATTACH_ORIGINAL 	| Attach the original raw email as a .txt file (1 to enable, 0 to disable) 	|     No    	|          1         	|
| AWS_REGION             	| AWS region                                                               	|     No    	| (Value set by AWS) 	|
| AWS_ACCESS_KEY_ID      	| AWS access key to be used                                                	|     No    	| (Value set by AWS) 	|
| AWS_SECRET_ACCESS_KEY  	| Corresponding AWS secret access key                                      	|     No    	| (Value set by AWS) 	|

You'll also need to make sure your Lambda execution role permits the forwarder to have access to S3 and SES services.
