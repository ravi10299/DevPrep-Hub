import { createHash } from 'node:crypto';
import bcryptjs from 'bcryptjs';
import { getClient, initializeDatabase } from './database.js';
import type { InStatement } from '@libsql/client';

function deterministicId(seed: string): string {
  const hex = createHash('sha256').update(`devprephub:${seed}`).digest('hex');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20, 32)}`;
}

export async function seedDatabase(): Promise<void> {
  await initializeDatabase();
  const db = getClient();

  const existing = await db.execute({ sql: 'SELECT id FROM users WHERE role = ?', args: ['ADMIN'] });
  if (existing.rows.length > 0) {
    const shashiExists = await db.execute({ sql: 'SELECT id FROM users WHERE email = ?', args: ['shashi@devprephub.com'] });
    if (shashiExists.rows.length === 0) {
      const shashiId = deterministicId('user:shashi');
      const shashiHash = await bcryptjs.hash('AdminShashi1', 12);
      await db.execute({
        sql: 'INSERT INTO users (id, email, name, password_hash, role, portfolio_url) VALUES (?, ?, ?, ?, ?, ?)',
        args: [shashiId, 'shashi@devprephub.com', 'Shashi', shashiHash, 'CONTRIBUTOR', 'https://shashisa.vercel.app'],
      });
    }
    return;
  }

  const adminId = deterministicId('user:admin');
  const adminPasswordHash = await bcryptjs.hash(
    process.env['ADMIN_PASSWORD'] || 'admin123',
    12
  );

  const statements: InStatement[] = [];

  statements.push({
    sql: 'INSERT INTO users (id, email, name, password_hash, role) VALUES (?, ?, ?, ?, ?)',
    args: [adminId, 'admin@devprephub.com', 'Admin', adminPasswordHash, 'ADMIN'],
  });

  const shashiId = deterministicId('user:shashi');
  const shashiPasswordHash = await bcryptjs.hash('AdminShashi1', 12);
  statements.push({
    sql: 'INSERT INTO users (id, email, name, password_hash, role, portfolio_url) VALUES (?, ?, ?, ?, ?, ?)',
    args: [shashiId, 'shashi@devprephub.com', 'Shashi', shashiPasswordHash, 'CONTRIBUTOR', 'https://shashisa.vercel.app'],
  });

  const domains: Record<string, string> = {};
  const domainData = [
    { name: 'Programming Languages', slug: 'programming', sort: 0 },
    { name: 'Backend Development', slug: 'backend', sort: 1 },
    { name: 'Frontend Development', slug: 'frontend', sort: 2 },
    { name: 'Databases', slug: 'databases', sort: 3 },
    { name: 'Behavioral / HR', slug: 'behavioral', sort: 4 },
  ];

  for (const d of domainData) {
    const id = deterministicId(`domain:${d.slug}`);
    domains[d.slug] = id;
    statements.push({
      sql: 'INSERT INTO technology_domains (id, name, slug, sort_order) VALUES (?, ?, ?, ?)',
      args: [id, d.name, d.slug, d.sort],
    });
  }

  const techs: Record<string, string> = {};
  const techData = [
    { name: 'Java Core', slug: 'java-core', icon: 'devicon-java-plain', domain: 'programming', sort: 0 },
    { name: 'Spring Boot', slug: 'spring-boot', icon: 'devicon-spring-plain', domain: 'backend', sort: 0 },
    { name: 'Angular', slug: 'angular', icon: 'devicon-angular-plain', domain: 'frontend', sort: 0 },
    { name: 'React', slug: 'react', icon: 'devicon-react-original', domain: 'frontend', sort: 1 },
    { name: 'MySQL', slug: 'mysql', icon: 'devicon-mysql-original', domain: 'databases', sort: 0 },
    { name: 'HR', slug: 'hr', icon: 'devicon-hugo-plain colored', domain: 'behavioral', sort: 0 },
  ];

  for (const t of techData) {
    const id = deterministicId(`tech:${t.slug}`);
    techs[t.name] = id;
    statements.push({
      sql: 'INSERT INTO technologies (id, name, slug, icon, domain_id, sort_order) VALUES (?, ?, ?, ?, ?, ?)',
      args: [id, t.name, t.slug, t.icon, domains[t.domain], t.sort],
    });
  }

  const companies: Record<string, string> = {};
  const companyData = [
    { name: 'Infosys', slug: 'infosys' },
    { name: 'TCS', slug: 'tcs' },
    { name: 'Wipro', slug: 'wipro' },
    { name: 'Cognizant', slug: 'cognizant' },
    { name: 'Accenture', slug: 'accenture' },
    { name: 'Amazon', slug: 'amazon' },
  ];

  for (const c of companyData) {
    const id = deterministicId(`company:${c.slug}`);
    companies[c.name] = id;
    statements.push({
      sql: 'INSERT INTO companies (id, name, slug) VALUES (?, ?, ?)',
      args: [id, c.name, c.slug],
    });
  }

  const tags: Record<string, string> = {};
  const tagNames = [
    'Angular', 'Lifecycle Hooks', 'ngOnInit', 'Components',
    'RxJS', 'Subject', 'BehaviorSubject', 'Observables',
    'Spring Boot', 'REST API', 'RestController', 'Annotations',
    'Java 8', 'Streams', 'filter', 'map',
    'MySQL', 'JOIN', 'SQL', 'Database',
    'Spring Security', 'JWT', 'Authentication', 'Authorization',
    'Observable', 'Promise',
    'Microservices', 'Architecture', 'Distributed Systems',
    'CORS', 'Security',
    'Performance', 'Indexing', 'Optimization',
    'Dependency Injection', 'Services',
    'Java', 'Exception Handling', 'Checked Exception', 'Unchecked Exception',
  ];

  for (const name of tagNames) {
    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    if (!tags[name]) {
      const id = deterministicId(`tag:${slug}`);
      tags[name] = id;
      statements.push({
        sql: 'INSERT OR IGNORE INTO tags (id, name, slug) VALUES (?, ?, ?)',
        args: [id, name, slug],
      });
    }
  }

  const questions = [
    {
      title: 'What are Angular Lifecycle Hooks? Explain ngOnInit() with example.',
      technology: 'Angular', company: 'Infosys', difficulty: 'Easy',
      tags: ['Angular', 'Lifecycle Hooks', 'ngOnInit', 'Components'],
      answer: [
        'Angular Lifecycle Hooks are special methods that allow developers to execute code at specific stages of a component lifecycle.',
        'ngOnInit() is called once after Angular initializes the component inputs.',
        'It is commonly used for initialization logic such as API calls, loading data, and setting initial component state.',
      ],
      codeLanguage: 'typescript',
      code: `import { Component, OnInit } from '@angular/core';\n\n@Component({\n  selector: 'app-demo',\n  templateUrl: './demo.component.html'\n})\nexport class DemoComponent implements OnInit {\n\n  ngOnInit(): void {\n    console.log('Component initialized');\n  }\n}`,
    },
    {
      title: 'Explain the difference between Subject and BehaviorSubject in RxJS.',
      technology: 'Angular', company: 'Wipro', difficulty: 'Easy',
      tags: ['RxJS', 'Subject', 'BehaviorSubject', 'Observables'],
      answer: [
        'A Subject does not store the previous emitted value.',
        'A BehaviorSubject stores the latest value and immediately sends that value to a new subscriber.',
        'BehaviorSubject requires an initial value.',
      ],
      codeLanguage: 'typescript',
      code: `import { BehaviorSubject } from 'rxjs';\n\nconst userSubject =\n  new BehaviorSubject<string>('Guest');\n\nuserSubject.subscribe(user => {\n  console.log(user);\n});\n\nuserSubject.next('Ravi');`,
    },
    {
      title: 'What are REST Annotations in Spring Boot? Explain @RestController.',
      technology: 'Spring Boot', company: 'Infosys', difficulty: 'Easy',
      tags: ['Spring Boot', 'REST API', 'RestController', 'Annotations'],
      answer: [
        '@RestController is a Spring annotation used to create RESTful web services.',
        'It combines @Controller and @ResponseBody.',
        'Methods inside the controller normally return data directly as JSON or XML.',
      ],
      codeLanguage: 'java',
      code: `@RestController\n@RequestMapping("/api/users")\npublic class UserController {\n\n    @GetMapping\n    public List<User> getUsers() {\n        return userService.getUsers();\n    }\n}`,
    },
    {
      title: 'Java 8 Stream API – How does filter() and map() work?',
      technology: 'Java Core', company: 'TCS', difficulty: 'Easy',
      tags: ['Java 8', 'Streams', 'filter', 'map'],
      answer: [
        'The Stream API was introduced in Java 8 to process collections in a functional style.',
        'filter() is used to select elements based on a condition.',
        'map() transforms each element into another value.',
      ],
      codeLanguage: 'java',
      code: `List<Integer> numbers =\n    Arrays.asList(10, 15, 20, 25);\n\nList<Integer> result =\n    numbers.stream()\n        .filter(n -> n > 15)\n        .map(n -> n * 2)\n        .toList();`,
    },
    {
      title: 'What are the different types of JOINs in MySQL? Explain with example.',
      technology: 'MySQL', company: 'TCS', difficulty: 'Easy',
      tags: ['MySQL', 'JOIN', 'SQL', 'Database'],
      answer: [
        'JOINs are used to combine rows from two or more tables based on a related column.',
        'Common JOIN types are INNER JOIN, LEFT JOIN, RIGHT JOIN and CROSS JOIN.',
        'INNER JOIN returns only matching records from both tables.',
      ],
      codeLanguage: 'sql',
      code: `SELECT\n    e.name,\n    d.department_name\nFROM employees e\nINNER JOIN departments d\n    ON e.department_id = d.id;`,
    },
    {
      title: 'How does Spring Security JWT Authentication work?',
      technology: 'Spring Boot', company: 'Wipro', difficulty: 'Medium',
      tags: ['Spring Security', 'JWT', 'Authentication', 'Authorization'],
      answer: [
        'JWT authentication is commonly used for stateless authentication in REST APIs.',
        'The user first sends username and password to the authentication endpoint.',
        'After successful authentication, the server generates a JWT token.',
        'The client sends the token with subsequent requests using the Authorization header.',
        'Spring Security validates the JWT before allowing access to protected resources.',
      ],
      codeLanguage: 'java',
      code: `Authorization: Bearer <JWT_TOKEN>\n\n@GetMapping("/profile")\npublic ResponseEntity<User> profile() {\n    return ResponseEntity.ok(userService.getProfile());\n}`,
    },
    {
      title: 'What is the difference between Angular Observables and Promises?',
      technology: 'Angular', company: 'Wipro', difficulty: 'Medium',
      tags: ['Angular', 'RxJS', 'Observable', 'Promise'],
      answer: [
        'A Promise represents a single future value.',
        'An Observable can emit multiple values over time.',
        'Observables can be cancelled by unsubscribing.',
        'Angular HttpClient primarily uses Observables.',
      ],
      codeLanguage: 'typescript',
      code: `this.http\n  .get<User[]>('/api/users')\n  .subscribe(users => {\n    console.log(users);\n  });`,
    },
    {
      title: 'What is Microservices Architecture? Explain its advantages.',
      technology: 'Spring Boot', company: 'Accenture', difficulty: 'Hard',
      tags: ['Microservices', 'Spring Boot', 'Architecture', 'Distributed Systems'],
      answer: [
        'Microservices architecture divides an application into small, independently deployable services.',
        'Each service generally focuses on a specific business capability.',
        'Services can be developed, deployed and scaled independently.',
        'Communication can happen through REST APIs, messaging systems or event-driven architecture.',
      ],
      codeLanguage: 'text',
      code: `Client\n   |\nAPI Gateway\n   |\n   +---- User Service\n   |\n   +---- Order Service\n   |\n   +---- Payment Service\n   |\n   +---- Product Service`,
    },
    {
      title: 'What is CORS and how can it be handled in Spring Boot?',
      technology: 'Spring Boot', company: 'Cognizant', difficulty: 'Medium',
      tags: ['CORS', 'Spring Boot', 'Security', 'REST API'],
      answer: [
        'CORS stands for Cross-Origin Resource Sharing.',
        'It controls whether a browser allows a web application from one origin to access resources from another origin.',
        'In Spring Boot, CORS can be configured using @CrossOrigin or a global WebMvcConfigurer configuration.',
      ],
      codeLanguage: 'java',
      code: `@CrossOrigin(\n    origins = "http://localhost:4200"\n)\n@RestController\npublic class UserController {\n\n    @GetMapping("/users")\n    public List<User> getUsers() {\n        return service.getUsers();\n    }\n}`,
    },
    {
      title: 'How can you improve MySQL query performance?',
      technology: 'MySQL', company: 'TCS', difficulty: 'Hard',
      tags: ['MySQL', 'Performance', 'Indexing', 'Optimization'],
      answer: [
        'Use appropriate indexes on columns frequently used in WHERE, JOIN and ORDER BY operations.',
        'Avoid SELECT * when only a few columns are required.',
        'Use EXPLAIN to analyze query execution plans.',
        'Avoid unnecessary joins and subqueries.',
        'Keep database statistics and indexes properly maintained.',
      ],
      codeLanguage: 'sql',
      code: `EXPLAIN\nSELECT\n    id,\n    name,\n    email\nFROM users\nWHERE email = 'ravi@example.com';\n\nCREATE INDEX idx_users_email\nON users(email);`,
    },
    {
      title: 'What is Dependency Injection in Angular?',
      technology: 'Angular', company: 'Amazon', difficulty: 'Medium',
      tags: ['Angular', 'Dependency Injection', 'Services', 'Architecture'],
      answer: [
        'Dependency Injection is a design pattern used by Angular to provide required dependencies to classes.',
        'Angular has a built-in dependency injection system.',
        'Services are commonly injected into components using the constructor or inject() function.',
      ],
      codeLanguage: 'typescript',
      code: `import { Component, inject } from '@angular/core';\n\n@Component({\n  selector: 'app-user',\n  template: 'User Component'\n})\nexport class UserComponent {\n\n  private userService = inject(UserService);\n}`,
    },
    {
      title: 'Explain Java Exception Handling and the difference between checked and unchecked exceptions.',
      technology: 'Java Core', company: 'Infosys', difficulty: 'Medium',
      tags: ['Java', 'Exception Handling', 'Checked Exception', 'Unchecked Exception'],
      answer: [
        'Exception handling is used to handle runtime problems without abruptly terminating the application.',
        'Checked exceptions are checked by the compiler and generally must be handled or declared.',
        'Unchecked exceptions extend RuntimeException and are not checked at compile time.',
        'try, catch, finally, throw and throws are commonly used for exception handling.',
      ],
      codeLanguage: 'java',
      code: `try {\n    int result = 10 / 0;\n}\ncatch (ArithmeticException ex) {\n    System.out.println(\n        "Cannot divide by zero"\n    );\n}\nfinally {\n    System.out.println("Completed");\n}`,
    },
  ];

  for (const q of questions) {
    const contentId = deterministicId(`content:${q.title}`);
    const body = JSON.stringify(q.answer);

    statements.push({
      sql: `INSERT INTO content (id, title, body, content_type, difficulty, code_snippet, code_language, status, author_id)
            VALUES (?, ?, ?, ?, ?, ?, ?, 'APPROVED', ?)`,
      args: [contentId, q.title, body, 'QUESTION', q.difficulty, q.code || null, q.codeLanguage || null, adminId],
    });

    if (techs[q.technology]) {
      statements.push({
        sql: 'INSERT INTO content_technologies (content_id, technology_id) VALUES (?, ?)',
        args: [contentId, techs[q.technology]],
      });
    }

    if (companies[q.company]) {
      statements.push({
        sql: 'INSERT INTO content_companies (content_id, company_id) VALUES (?, ?)',
        args: [contentId, companies[q.company]],
      });
    }

    for (const tagName of q.tags) {
      if (tags[tagName]) {
        statements.push({
          sql: 'INSERT INTO content_tags (content_id, tag_id) VALUES (?, ?)',
          args: [contentId, tags[tagName]],
        });
      }
    }
  }

  await db.batch(statements, 'write');
  console.log('Database seeded with initial data');
}
