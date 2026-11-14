import type { QuestionDto } from '@/http/generated/api.schemas';

export type Sample = { question: QuestionDto; correct: number[]; explanation: string; domain: string };

type Raw = [text: string, answers: string[], correct: number[], explanation: string, domain: string];

// Answer ids are questionNumber * 10 + position (1-based).
const RAW: Raw[] = [
  ['You need to run containers without managing servers or clusters. Which AWS service should you use?', ['Amazon EC2 with an Auto Scaling group', 'AWS Fargate', 'Amazon EKS on self-managed nodes', 'Amazon Elastic Block Store'], [2], 'AWS Fargate manages the compute for your containers. You define the application and its resource needs; AWS handles the servers.', 'Technology'],
  ['An application must stay available if one Availability Zone fails. Which TWO choices improve its resilience?', ['Distribute instances across multiple Availability Zones', 'Place all instances in a single subnet', 'Use a load balancer to route traffic to healthy instances', 'Store all state on one instance’s local disk'], [1, 3], 'Multiple Availability Zones remove a single-zone dependency. A load balancer directs requests to the healthy instances that remain.', 'Technology'],
  ['Which service stores unstructured objects such as images, videos, and backups?', ['Amazon RDS', 'Amazon S3', 'Amazon ElastiCache', 'Amazon Route 53'], [2], 'Amazon S3 is object storage for unstructured data such as images, video, documents, and backups.', 'Technology'],
  ['Under the shared responsibility model, which task is the customer’s responsibility?', ['Patching the hypervisor', 'Securing the physical data centers', 'Configuring security group rules', 'Replacing failed disks'], [3], 'AWS secures the cloud itself. Customers secure what they put in it, including security group configuration.', 'Security'],
  ['Which pricing model gives the largest discount for a steady workload you commit to for three years?', ['On-Demand', 'Spot Instances', 'Savings Plans', 'Dedicated Hosts'], [3], 'Savings Plans trade a one- or three-year usage commitment for a large discount over On-Demand.', 'Billing'],
  ['Which service gives a single place to view and manage costs across accounts?', ['AWS Cost Explorer', 'Amazon Inspector', 'AWS Config', 'AWS Shield'], [1], 'Cost Explorer visualizes and forecasts spend across accounts and services.', 'Billing'],
  ['A company wants to block common web exploits such as SQL injection at the edge. Which service fits?', ['AWS WAF', 'Amazon GuardDuty', 'AWS KMS', 'Amazon Macie'], [1], 'AWS WAF filters HTTP requests using rules that match patterns like SQL injection and cross-site scripting.', 'Security'],
  ['Which TWO are benefits of cloud computing over on-premises infrastructure?', ['Trade capital expense for variable expense', 'Guaranteed lower latency for every user', 'Stop guessing capacity', 'No need for any security controls'], [1, 3], 'You pay for what you use instead of buying hardware up front, and you scale to demand instead of forecasting it.', 'Cloud Concepts'],
  ['Which service is a managed relational database?', ['Amazon DynamoDB', 'Amazon RDS', 'Amazon Redshift Spectrum', 'Amazon Neptune'], [2], 'Amazon RDS runs managed relational engines such as PostgreSQL and MySQL.', 'Technology'],
  ['Which Well-Architected pillar covers recovering from failures and meeting demand?', ['Performance Efficiency', 'Reliability', 'Cost Optimization', 'Operational Excellence'], [2], 'Reliability covers recovering from disruption and scaling to meet demand.', 'Cloud Concepts'],
  ['Which service delivers content from edge locations close to users?', ['Amazon CloudFront', 'AWS Direct Connect', 'Amazon VPC', 'AWS Snowball'], [1], 'CloudFront is a content delivery network that caches content at edge locations.', 'Technology'],
  ['Which identity should you use for everyday administrative work in a new account?', ['The root user', 'An IAM user or role with least privilege', 'A shared team password', 'An access key embedded in code'], [2], 'Lock away the root user and work through least-privilege IAM identities.', 'Security'],
  ['Which service runs code in response to events without provisioning servers?', ['AWS Lambda', 'Amazon EC2', 'Amazon Lightsail', 'AWS Outposts'], [1], 'Lambda runs functions on demand and bills per request and duration.', 'Technology'],
  ['Which support plan includes a designated Technical Account Manager?', ['Basic', 'Developer', 'Business', 'Enterprise'], [4], 'Enterprise Support includes a designated Technical Account Manager.', 'Billing'],
  ['Which service records API calls made in your account for auditing?', ['Amazon CloudWatch', 'AWS CloudTrail', 'AWS Trusted Advisor', 'AWS X-Ray'], [2], 'CloudTrail logs API activity, showing who did what and when.', 'Security']
];

export const SAMPLES: Sample[] = RAW.map(([text, answers, correct, explanation, domain], q) => {
  const base = (q + 1) * 10;
  return {
    question: {
      id: q + 1,
      type: correct.length > 1 ? 'multiple_response' : 'multiple_choice',
      selectCount: correct.length,
      difficulty: q % 3 === 0 ? 'easy' : q % 3 === 1 ? 'medium' : 'hard',
      text,
      answers: answers.map((answer, a) => ({ id: base + a + 1, text: answer }))
    },
    correct: correct.map(position => base + position),
    explanation,
    domain
  };
});
