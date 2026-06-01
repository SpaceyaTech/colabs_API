import swaggerJsdoc from 'swagger-jsdoc';

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Colabs API',
      version: '1.0.0',
      description: 'REST API for the SpaceYaTech open-source collaboration & freelance platform',
    },
    servers: [
      { url: 'http://localhost:8000', description: 'Local development' },
      { url: 'https://api.sytcolabs.vercel.app', description: 'Production' },
    ],
    components: {
      securitySchemes: {
        cookieAuth: {
          type: 'apiKey',
          in: 'cookie',
          name: 'token',
        },
      },
      schemas: {
        User: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            githubId: { type: 'string' },
            username: { type: 'string' },
            name: { type: 'string', nullable: true },
            email: { type: 'string', nullable: true },
            avatarUrl: { type: 'string', nullable: true },
            bio: { type: 'string', nullable: true },
            location: { type: 'string', nullable: true },
            websiteUrl: { type: 'string', nullable: true },
            githubUrl: { type: 'string', nullable: true },
            role: { type: 'string', enum: ['CONTRIBUTOR', 'PROJECT_OWNER', 'CLIENT', 'ADMIN'] },
            contributorScore: { type: 'integer' },
            createdAt: { type: 'string', format: 'date-time' },
          },
        },
        Project: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            githubRepoUrl: { type: 'string' },
            name: { type: 'string' },
            description: { type: 'string', nullable: true },
            language: { type: 'string', nullable: true },
            stars: { type: 'integer' },
            forks: { type: 'integer' },
            topics: { type: 'array', items: { type: 'string' } },
            logoUrl: { type: 'string', nullable: true },
            ownerId: { type: 'string' },
            createdAt: { type: 'string', format: 'date-time' },
          },
        },
        Issue: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            githubIssueId: { type: 'integer' },
            title: { type: 'string' },
            body: { type: 'string', nullable: true },
            url: { type: 'string' },
            labels: { type: 'array', items: { type: 'string' } },
            status: { type: 'string', enum: ['OPEN', 'CLAIMED', 'IN_REVIEW', 'CLOSED'] },
            projectId: { type: 'string' },
            createdAt: { type: 'string', format: 'date-time' },
          },
        },
        Gig: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            title: { type: 'string' },
            description: { type: 'string' },
            budget: { type: 'number' },
            currency: { type: 'string' },
            skills: { type: 'array', items: { type: 'string' } },
            status: { type: 'string', enum: ['OPEN', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'] },
            deadline: { type: 'string', format: 'date-time', nullable: true },
            attachments: { type: 'array', items: { type: 'string' } },
            clientId: { type: 'string' },
            createdAt: { type: 'string', format: 'date-time' },
          },
        },
        Proposal: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            coverLetter: { type: 'string' },
            bidAmount: { type: 'number' },
            currency: { type: 'string' },
            deliveryDays: { type: 'integer' },
            status: { type: 'string', enum: ['PENDING', 'ACCEPTED', 'REJECTED', 'WITHDRAWN'] },
            gigId: { type: 'string' },
            userId: { type: 'string' },
            createdAt: { type: 'string', format: 'date-time' },
          },
        },
        Team: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            name: { type: 'string' },
            description: { type: 'string', nullable: true },
            logoUrl: { type: 'string', nullable: true },
            ownerId: { type: 'string' },
            createdAt: { type: 'string', format: 'date-time' },
          },
        },
        Error: {
          type: 'object',
          properties: {
            error: { type: 'string' },
          },
        },
      },
    },
  },
  apis: ['./src/modules/**/*.routes.ts'],
};

export const swaggerSpec = swaggerJsdoc(options);
