import swaggerJsdoc from 'swagger-jsdoc';

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Colabs API',
      version: '1.0.0',
      description:
        'REST API for the SpaceYaTech open-source collaboration & freelance platform. ' +
        'Authentication: email/password registration, email verification, GitHub OAuth, Google OAuth, and JWT session cookies. ' +
        'See the Auth tag for all auth endpoints.',
    },
    servers: [
      { url: 'http://localhost:8000', description: 'Local development' },
      { url: 'https://api.sytcolabs.vercel.app', description: 'Production' },
    ],
    tags: [
      {
        name: 'Auth',
        description:
          'Email/password registration, email verification, GitHub OAuth, Google OAuth, and session management.',
      },
      {
        name: 'Integrations',
        description:
          'Connected third-party accounts managed by authenticated users.',
      },
      { name: 'Users', description: 'User profiles and contribution stats' },
      { name: 'Dashboard', description: 'User dashboard analytics' },
      { name: 'Projects', description: 'Open-source project registration and management' },
      { name: 'Issues', description: 'Open-source issues available for contributors to claim' },
      { name: 'Gigs', description: 'Freelance gig marketplace' },
      { name: 'Proposals', description: 'Gig proposals from freelancers' },
      { name: 'Teams', description: 'Collaborative teams' },
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
            githubId: { type: 'string', nullable: true },
            googleId: { type: 'string', nullable: true },
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
            emailVerified: { type: 'boolean' },
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
        ErrorWithCode: {
          type: 'object',
          properties: {
            error: { type: 'string' },
            code: { type: 'string', example: 'EMAIL_NOT_VERIFIED' },
          },
        },
        ValidationError: {
          type: 'object',
          properties: {
            error: { type: 'string', example: 'Validation failed' },
            details: { type: 'object' },
          },
        },
        MessageResponse: {
          type: 'object',
          properties: {
            message: { type: 'string' },
          },
        },
        RegisterRequest: {
          type: 'object',
          required: ['email', 'password'],
          properties: {
            email: { type: 'string', format: 'email', example: 'you@example.com' },
            password: { type: 'string', minLength: 6, example: 'securepass123' },
            name: { type: 'string', example: 'Jane Doe' },
          },
        },
        LoginRequest: {
          type: 'object',
          required: ['email', 'password'],
          properties: {
            email: { type: 'string', format: 'email', example: 'you@example.com' },
            password: { type: 'string', example: 'securepass123' },
          },
        },
        ResendVerificationRequest: {
          type: 'object',
          required: ['email'],
          properties: {
            email: { type: 'string', format: 'email', example: 'you@example.com' },
          },
        },
        RegisterResponse: {
          type: 'object',
          properties: {
            message: { type: 'string' },
            user: {
              type: 'object',
              properties: {
                id: { type: 'string' },
                email: { type: 'string' },
                emailVerified: { type: 'boolean', example: false },
              },
            },
          },
        },
        LoginResponse: {
          type: 'object',
          properties: {
            user: { $ref: '#/components/schemas/User' },
          },
        },
        VerifyEmailResponse: {
          type: 'object',
          properties: {
            message: { type: 'string', example: 'Email verified successfully' },
            user: { $ref: '#/components/schemas/User' },
          },
        },
      },
    },
  },
  apis: ['./src/modules/**/*.routes.ts'],
};

const AUTH_PATH_ORDER = [
  '/api/auth/register',
  '/api/auth/login',
  '/api/auth/verify-email',
  '/api/auth/resend-verification',
  '/api/auth/forgot-password',
  '/api/auth/reset-password',
  '/api/auth/change-password',
  '/api/auth/github',
  '/api/auth/github/callback',
  '/api/auth/google',
  '/api/auth/google/callback',
  '/api/auth/me',
  '/api/auth/logout',
];

const INTEGRATION_PATH_ORDER = [
  '/api/integrations/github',
  '/api/integrations/github/connect',
  '/api/integrations/github/callback',
];

const sortPathsAuthFirst = (spec: Record<string, unknown>) => {
  const paths = spec.paths as Record<string, unknown> | undefined;
  if (!paths) return spec;

  const rank = (path: string) => {
    const authIndex = AUTH_PATH_ORDER.indexOf(path);
    if (authIndex >= 0) return authIndex;
    if (path.startsWith('/api/auth')) return AUTH_PATH_ORDER.length;
    const integrationIndex = INTEGRATION_PATH_ORDER.indexOf(path);
    if (integrationIndex >= 0) return AUTH_PATH_ORDER.length + 1 + integrationIndex;
    if (path.startsWith('/api/integrations')) {
      return AUTH_PATH_ORDER.length + 1 + INTEGRATION_PATH_ORDER.length;
    }
    return AUTH_PATH_ORDER.length + 2 + INTEGRATION_PATH_ORDER.length;
  };

  const sorted = Object.entries(paths).sort(([a], [b]) => {
    const rankDiff = rank(a) - rank(b);
    return rankDiff !== 0 ? rankDiff : a.localeCompare(b);
  });

  return { ...spec, paths: Object.fromEntries(sorted) };
};

export const swaggerSpec = sortPathsAuthFirst(
  swaggerJsdoc(options) as Record<string, unknown>
);
