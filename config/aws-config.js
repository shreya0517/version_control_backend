const AWS = require("aws-sdk");

AWS.config.update({ region: "ap-south-1" });

const s3 = new AWS.S3();
const S3_BUCKET = "sirigithubclonebucket";

const s3BucketPolicy = {
	Version: "2012-10-17",
	Statement: [
		{
			Effect: "Allow",
			Principal: {
				AWS: "arn:aws:s3:::sirigithubclonebucket",
			},
			Action: "s3:*",
			Resource: [
				"arn:aws:s3:::sirigithubclonebucket",
				"arn:aws:s3:::sirigithubclonebucket/*",
			],
		},
	],
};

module.exports = { s3, S3_BUCKET, s3BucketPolicy };
