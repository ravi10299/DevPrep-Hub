import { Component, OnInit, signal, computed } from '@angular/core';

type Difficulty = 'Easy' | 'Medium' | 'Hard';

type Technology = 'Angular' | 'Java Core' | 'Spring Boot' | 'React' | 'MySQL' | 'HR';

type Company = 'Infosys' | 'TCS' | 'Wipro' | 'Cognizant' | 'Accenture' | 'Amazon';

interface InterviewQuestion {
  id: number;
  title: string;
  technology: Technology;
  company: Company;
  difficulty: Difficulty;
  tags: string[];
  answer: string[];
  code?: string;
  codeLanguage?: string;
}

@Component({
  selector: 'app-root',
  standalone: true,
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App implements OnInit {
  /* ================================
     SIDEBAR
  ================================= */

  sidebarOpen = signal(false);

  /* ================================
     SEARCH
  ================================= */

  searchTerm = signal('');

  /* ================================
     FILTERS
  ================================= */

  selectedCategory = signal<Technology | 'All'>('All');

  selectedCompanies = signal<Company[]>([]);

  selectedDifficulty = signal<Difficulty | 'All'>('All');

  /* ================================
     UI STATE
  ================================= */

  expandedQuestionId = signal<number | null>(1);

  copiedQuestionId = signal<number | null>(null);

  bookmarkedIds = signal<number[]>([]);

  darkMode = signal(false);

  /* ================================
     TECHNOLOGIES
  ================================= */

  technologies: {
    name: Technology;
    icon: string;
    type: string;
  }[] = [
    {
      name: 'Java Core',
      icon: 'devicon-java-plain',
      type: 'Programming',
    },
    {
      name: 'Spring Boot',
      icon: 'devicon-spring-plain',
      type: 'Backend',
    },
    {
      name: 'Angular',
      icon: 'devicon-angular-plain',
      type: 'Frontend',
    },

    {
      name: 'React',
      icon: 'devicon-react-original',
      type: 'Frontend',
    },
    {
      name: 'MySQL',
      icon: 'devicon-mysql-original',
      type: 'Database',
    },
    {
      name: 'HR',
      icon: 'devicon-hugo-plain colored',
      type: 'HR Interview',
    },
  ];

  /* ================================
     COMPANIES
  ================================= */

  companies: {
    name: Company;
    count: number;
  }[] = [
    {
      name: 'Infosys',
      count: 0,
    },
    {
      name: 'TCS',
      count: 0,
    },
    {
      name: 'Wipro',
      count: 0,
    },
    {
      name: 'Cognizant',
      count: 0,
    },
    {
      name: 'Accenture',
      count: 0,
    },
    {
      name: 'Amazon',
      count: 0,
    },
  ];

  /* ================================
     QUESTIONS
  ================================= */

  questions: InterviewQuestion[] = [
    {
      id: 1,

      title: 'What are Angular Lifecycle Hooks? Explain ngOnInit() with example.',

      technology: 'Angular',

      company: 'Infosys',

      difficulty: 'Easy',

      tags: ['Angular', 'Lifecycle Hooks', 'ngOnInit', 'Components'],

      answer: [
        'Angular Lifecycle Hooks are special methods that allow developers to execute code at specific stages of a component lifecycle.',

        'ngOnInit() is called once after Angular initializes the component inputs.',

        'It is commonly used for initialization logic such as API calls, loading data, and setting initial component state.',
      ],

      codeLanguage: 'typescript',

      code: `import { Component, OnInit } from '@angular/core';

@Component({
  selector: 'app-demo',
  templateUrl: './demo.component.html'
})
export class DemoComponent implements OnInit {

  ngOnInit(): void {
    console.log('Component initialized');
  }
}`,
    },

    {
      id: 2,

      title: 'Explain the difference between Subject and BehaviorSubject in RxJS.',

      technology: 'Angular',

      company: 'Wipro',

      difficulty: 'Easy',

      tags: ['RxJS', 'Subject', 'BehaviorSubject', 'Observables'],

      answer: [
        'A Subject does not store the previous emitted value.',

        'A BehaviorSubject stores the latest value and immediately sends that value to a new subscriber.',

        'BehaviorSubject requires an initial value.',
      ],

      codeLanguage: 'typescript',

      code: `import { BehaviorSubject } from 'rxjs';

const userSubject =
  new BehaviorSubject<string>('Guest');

userSubject.subscribe(user => {
  console.log(user);
});

userSubject.next('Ravi');`,
    },

    {
      id: 3,

      title: 'What are REST Annotations in Spring Boot? Explain @RestController.',

      technology: 'Spring Boot',

      company: 'Infosys',

      difficulty: 'Easy',

      tags: ['Spring Boot', 'REST API', 'RestController', 'Annotations'],

      answer: [
        '@RestController is a Spring annotation used to create RESTful web services.',

        'It combines @Controller and @ResponseBody.',

        'Methods inside the controller normally return data directly as JSON or XML.',
      ],

      codeLanguage: 'java',

      code: `@RestController
@RequestMapping("/api/users")
public class UserController {

    @GetMapping
    public List<User> getUsers() {
        return userService.getUsers();
    }
}`,
    },

    {
      id: 4,

      title: 'Java 8 Stream API – How does filter() and map() work?',

      technology: 'Java Core',

      company: 'TCS',

      difficulty: 'Easy',

      tags: ['Java 8', 'Streams', 'filter', 'map'],

      answer: [
        'The Stream API was introduced in Java 8 to process collections in a functional style.',

        'filter() is used to select elements based on a condition.',

        'map() transforms each element into another value.',
      ],

      codeLanguage: 'java',

      code: `List<Integer> numbers =
    Arrays.asList(10, 15, 20, 25);

List<Integer> result =
    numbers.stream()
        .filter(n -> n > 15)
        .map(n -> n * 2)
        .toList();`,
    },

    {
      id: 5,

      title: 'What are the different types of JOINs in MySQL? Explain with example.',

      technology: 'MySQL',

      company: 'TCS',

      difficulty: 'Easy',

      tags: ['MySQL', 'JOIN', 'SQL', 'Database'],

      answer: [
        'JOINs are used to combine rows from two or more tables based on a related column.',

        'Common JOIN types are INNER JOIN, LEFT JOIN, RIGHT JOIN and CROSS JOIN.',

        'INNER JOIN returns only matching records from both tables.',
      ],

      codeLanguage: 'sql',

      code: `SELECT
    e.name,
    d.department_name
FROM employees e
INNER JOIN departments d
    ON e.department_id = d.id;`,
    },

    {
      id: 6,

      title: 'How does Spring Security JWT Authentication work?',

      technology: 'Spring Boot',

      company: 'Wipro',

      difficulty: 'Medium',

      tags: ['Spring Security', 'JWT', 'Authentication', 'Authorization'],

      answer: [
        'JWT authentication is commonly used for stateless authentication in REST APIs.',

        'The user first sends username and password to the authentication endpoint.',

        'After successful authentication, the server generates a JWT token.',

        'The client sends the token with subsequent requests using the Authorization header.',

        'Spring Security validates the JWT before allowing access to protected resources.',
      ],

      codeLanguage: 'java',

      code: `Authorization: Bearer <JWT_TOKEN>

@GetMapping("/profile")
public ResponseEntity<User> profile() {
    return ResponseEntity.ok(userService.getProfile());
}`,
    },

    {
      id: 7,

      title: 'What is the difference between Angular Observables and Promises?',

      technology: 'Angular',

      company: 'Wipro',

      difficulty: 'Medium',

      tags: ['Angular', 'RxJS', 'Observable', 'Promise'],

      answer: [
        'A Promise represents a single future value.',

        'An Observable can emit multiple values over time.',

        'Observables can be cancelled by unsubscribing.',

        'Angular HttpClient primarily uses Observables.',
      ],

      codeLanguage: 'typescript',

      code: `this.http
  .get<User[]>('/api/users')
  .subscribe(users => {
    console.log(users);
  });`,
    },

    {
      id: 8,

      title: 'What is Microservices Architecture? Explain its advantages.',

      technology: 'Spring Boot',

      company: 'Accenture',

      difficulty: 'Hard',

      tags: ['Microservices', 'Spring Boot', 'Architecture', 'Distributed Systems'],

      answer: [
        'Microservices architecture divides an application into small, independently deployable services.',

        'Each service generally focuses on a specific business capability.',

        'Services can be developed, deployed and scaled independently.',

        'Communication can happen through REST APIs, messaging systems or event-driven architecture.',
      ],

      codeLanguage: 'text',

      code: `Client
   |
API Gateway
   |
   +---- User Service
   |
   +---- Order Service
   |
   +---- Payment Service
   |
   +---- Product Service`,
    },

    {
      id: 9,

      title: 'What is CORS and how can it be handled in Spring Boot?',

      technology: 'Spring Boot',

      company: 'Cognizant',

      difficulty: 'Medium',

      tags: ['CORS', 'Spring Boot', 'Security', 'REST API'],

      answer: [
        'CORS stands for Cross-Origin Resource Sharing.',

        'It controls whether a browser allows a web application from one origin to access resources from another origin.',

        'In Spring Boot, CORS can be configured using @CrossOrigin or a global WebMvcConfigurer configuration.',
      ],

      codeLanguage: 'java',

      code: `@CrossOrigin(
    origins = "http://localhost:4200"
)
@RestController
public class UserController {

    @GetMapping("/users")
    public List<User> getUsers() {
        return service.getUsers();
    }
}`,
    },

    {
      id: 10,

      title: 'How can you improve MySQL query performance?',

      technology: 'MySQL',

      company: 'TCS',

      difficulty: 'Hard',

      tags: ['MySQL', 'Performance', 'Indexing', 'Optimization'],

      answer: [
        'Use appropriate indexes on columns frequently used in WHERE, JOIN and ORDER BY operations.',

        'Avoid SELECT * when only a few columns are required.',

        'Use EXPLAIN to analyze query execution plans.',

        'Avoid unnecessary joins and subqueries.',

        'Keep database statistics and indexes properly maintained.',
      ],

      codeLanguage: 'sql',

      code: `EXPLAIN
SELECT
    id,
    name,
    email
FROM users
WHERE email = 'ravi@example.com';

CREATE INDEX idx_users_email
ON users(email);`,
    },

    {
      id: 11,

      title: 'What is Dependency Injection in Angular?',

      technology: 'Angular',

      company: 'Amazon',

      difficulty: 'Medium',

      tags: ['Angular', 'Dependency Injection', 'Services', 'Architecture'],

      answer: [
        'Dependency Injection is a design pattern used by Angular to provide required dependencies to classes.',

        'Angular has a built-in dependency injection system.',

        'Services are commonly injected into components using the constructor or inject() function.',
      ],

      codeLanguage: 'typescript',

      code: `import { Component, inject } from '@angular/core';

@Component({
  selector: 'app-user',
  template: 'User Component'
})
export class UserComponent {

  private userService = inject(UserService);
}`,
    },

    {
      id: 12,

      title:
        'Explain Java Exception Handling and the difference between checked and unchecked exceptions.',

      technology: 'Java Core',

      company: 'Infosys',

      difficulty: 'Medium',

      tags: ['Java', 'Exception Handling', 'Checked Exception', 'Unchecked Exception'],

      answer: [
        'Exception handling is used to handle runtime problems without abruptly terminating the application.',

        'Checked exceptions are checked by the compiler and generally must be handled or declared.',

        'Unchecked exceptions extend RuntimeException and are not checked at compile time.',

        'try, catch, finally, throw and throws are commonly used for exception handling.',
      ],

      codeLanguage: 'java',

      code: `try {
    int result = 10 / 0;
}
catch (ArithmeticException ex) {
    System.out.println(
        "Cannot divide by zero"
    );
}
finally {
    System.out.println("Completed");
}`,
    },
  ];

  /* ================================
     COUNTER QUESTIONS
  ================================= */

  getCompanyCount(company: Company): number {
    return this.questions.filter((question) => question.company === company).length;
  }
  /* ================================
     COMPUTED FILTERED QUESTIONS
  ================================= */

  filteredQuestions = computed(() => {
    const search = this.searchTerm().trim().toLowerCase();

    const category = this.selectedCategory();

    const companies = this.selectedCompanies();

    const difficulty = this.selectedDifficulty();

    return this.questions.filter((question) => {
      const matchesSearch =
        !search ||
        question.title.toLowerCase().includes(search) ||
        question.technology.toLowerCase().includes(search) ||
        question.company.toLowerCase().includes(search) ||
        question.answer.some((a) => a.toLowerCase().includes(search)) ||
        question.tags.some((tag) => tag.toLowerCase().includes(search));

      const matchesCategory = category === 'All' || question.technology === category;

      const matchesCompany = companies.length === 0 || companies.includes(question.company);

      const matchesDifficulty = difficulty === 'All' || question.difficulty === difficulty;

      return matchesSearch && matchesCategory && matchesCompany && matchesDifficulty;
    });
  });

  /* ================================
     BOOKMARK COUNT
  ================================= */

  bookmarkCount = computed(() => this.bookmarkedIds().length);

  /* ================================
     FILTER ACTIVE CHECK
  ================================= */

  hasActiveFilters = computed(() => {
    return (
      this.selectedCategory() !== 'All' ||
      this.selectedCompanies().length > 0 ||
      this.selectedDifficulty() !== 'All' ||
      this.searchTerm().trim() !== ''
    );
  });

  /* ================================
     INIT
  ================================= */

  ngOnInit(): void {
    const savedBookmarks = localStorage.getItem('devprep-bookmarks');

    if (savedBookmarks) {
      try {
        const parsed = JSON.parse(savedBookmarks);

        if (Array.isArray(parsed)) {
          this.bookmarkedIds.set(parsed);
        }
      } catch {
        this.bookmarkedIds.set([]);
      }
    }

    const savedTheme = localStorage.getItem('devprep-theme');

    if (savedTheme === 'dark') {
      this.darkMode.set(true);
      document.body.classList.add('dark-theme');
    }

    // Dynamic company counts
    this.companies = this.companies.map((company) => ({
      ...company,
      count: this.questions.filter((question) => question.company === company.name).length,
    }));
  }

  /* ================================
     SEARCH
  ================================= */

  onSearch(event: Event): void {
    const input = event.target as HTMLInputElement;

    this.searchTerm.set(input.value);
  }

  /* ================================
     CATEGORY
  ================================= */

  selectCategory(category: Technology | 'All'): void {
    this.selectedCategory.set(category);

    this.closeSidebarOnMobile();
  }

  /* ================================
     COMPANY FILTER
  ================================= */

  toggleCompany(company: Company): void {
    const current = this.selectedCompanies();

    if (current.includes(company)) {
      this.selectedCompanies.set(current.filter((item) => item !== company));
    } else {
      this.selectedCompanies.set([...current, company]);
    }
  }

  isCompanySelected(company: Company): boolean {
    return this.selectedCompanies().includes(company);
  }

  /* ================================
     DIFFICULTY
  ================================= */

  selectDifficulty(difficulty: Difficulty | 'All'): void {
    this.selectedDifficulty.set(difficulty);
  }

  /* ================================
     CLEAR FILTERS
  ================================= */

  clearFilters(): void {
    this.selectedCategory.set('All');

    this.selectedCompanies.set([]);

    this.selectedDifficulty.set('All');

    this.searchTerm.set('');
  }

  /* ================================
     ACCORDION
  ================================= */

  toggleQuestion(id: number): void {
    if (this.expandedQuestionId() === id) {
      this.expandedQuestionId.set(null);
    } else {
      this.expandedQuestionId.set(id);
    }
  }

  isExpanded(id: number): boolean {
    return this.expandedQuestionId() === id;
  }

  /* ================================
     BOOKMARK
  ================================= */

  toggleBookmark(id: number): void {
    const current = this.bookmarkedIds();

    let updated: number[];

    if (current.includes(id)) {
      updated = current.filter((item) => item !== id);
    } else {
      updated = [...current, id];
    }

    this.bookmarkedIds.set(updated);

    localStorage.setItem('devprep-bookmarks', JSON.stringify(updated));
  }

  isBookmarked(id: number): boolean {
    return this.bookmarkedIds().includes(id);
  }

  /* ================================
     COPY CODE
  ================================= */

  async copyCode(question: InterviewQuestion): Promise<void> {
    if (!question.code) {
      return;
    }

    try {
      await navigator.clipboard.writeText(question.code);

      this.copiedQuestionId.set(question.id);

      setTimeout(() => {
        if (this.copiedQuestionId() === question.id) {
          this.copiedQuestionId.set(null);
        }
      }, 1800);
    } catch (error) {
      console.error('Unable to copy code', error);
    }
  }

  /* ================================
     THEME
  ================================= */

  toggleTheme(): void {
    const next = !this.darkMode();

    this.darkMode.set(next);

    if (next) {
      document.body.classList.add('dark-theme');

      localStorage.setItem('devprep-theme', 'dark');
    } else {
      document.body.classList.remove('dark-theme');

      localStorage.setItem('devprep-theme', 'light');
    }
  }

  /* ================================
     SIDEBAR
  ================================= */

  toggleSidebar(): void {
    this.sidebarOpen.update((value) => !value);
  }

  closeSidebar(): void {
    this.sidebarOpen.set(false);
  }

  private closeSidebarOnMobile(): void {
    if (window.innerWidth <= 900) {
      this.sidebarOpen.set(false);
    }
  }

  /* ================================
     TECHNOLOGY ICON
  ================================= */
  getTechnologyIcon(technology: Technology | 'All'): string {
    if (technology === 'All') {
      return '';
    }

    const iconMap: Record<Technology, string> = {
      Angular: 'devicon-angular-plain',
      'Java Core': 'devicon-java-plain',
      'Spring Boot': 'devicon-spring-plain',
      React: 'devicon-react-original',
      MySQL: 'devicon-mysql-original',
      HR: 'fa-solid fa-heart',
    };

    return iconMap[technology];
  }

  /* ================================
     Technology Question Count
  ================================= */
  getTechnologyCount(technology: Technology): number {
    return this.questions.filter((question) => question.technology === technology).length;
  }
  /* ================================
     COMPANY CLASS
  ================================= */

  getCompanyClass(company: Company): string {
    return company.toLowerCase().replace(/\s+/g, '-');
  }
}
