import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcryptjs';
import { User } from '@/modules/users/entities/user.entity';
import { Post } from '@/modules/posts/entities/post.entity';
import { Comment } from '@/modules/comments/entities/comment.entity';

@Injectable()
export class SeederService {
  constructor(
    @InjectRepository(User)
    private usersRepository: Repository<User>,
    @InjectRepository(Post)
    private postsRepository: Repository<Post>,
    @InjectRepository(Comment)
    private commentsRepository: Repository<Comment>,
  ) {}

  async seed() {
    // Clear existing data
    await this.commentsRepository.delete({});
    await this.postsRepository.delete({});
    await this.usersRepository.delete({});

    // Create users
    const hashedPassword = await bcrypt.hash('password123', 10);
    
    const users = await this.usersRepository.save([
      {
        name: 'John Doe',
        email: 'john@example.com',
        password: hashedPassword,
        avatar: 'https://ui-avatars.com/api/?name=John+Doe&background=0D8ABC&color=fff',
      },
      {
        name: 'Jane Smith',
        email: 'jane@example.com',
        password: hashedPassword,
        avatar: 'https://ui-avatars.com/api/?name=Jane+Smith&background=E91E63&color=fff',
      },
      {
        name: 'Bob Johnson',
        email: 'bob@example.com',
        password: hashedPassword,
        avatar: 'https://ui-avatars.com/api/?name=Bob+Johnson&background=FF9800&color=fff',
      },
      {
        name: 'Alice Brown',
        email: 'alice@example.com',
        password: hashedPassword,
        avatar: 'https://ui-avatars.com/api/?name=Alice+Brown&background=4CAF50&color=fff',
      },
    ]);

    // Create posts
    const posts = await this.postsRepository.save([
      {
        title: 'Getting Started with React Hooks',
        content: `React Hooks have revolutionized the way we write React components. They allow us to use state and other React features without writing a class component.

In this comprehensive guide, we'll explore the most commonly used hooks and learn how to create custom hooks for reusable logic.

useState is probably the most basic hook you'll use. It lets you add state to functional components:

const [count, setCount] = useState(0);

useEffect is another essential hook that lets you perform side effects in functional components. It serves the same purpose as componentDidMount, componentDidUpdate, and componentWillUnmount combined in React classes.

Custom hooks are a mechanism to reuse stateful logic between React components. They're just JavaScript functions whose names start with "use" and that may call other hooks.`,
        authorId: users[0].id,
        views: 156,
        likes: 23,
        image: 'https://picsum.photos/800/400?random=1',
      },
      {
        title: 'Understanding TypeScript Generics',
        content: `TypeScript generics provide a way to make components work with any data type and not restrict to one data type. So, components can be called or used with a variety of data types.

Generics in TypeScript is almost similar to C# generics. Let's see why we need Generics using the following example.

In the above example, the getArray function accepts an array of type any and returns an array of type any. It's too generic. We may want to specify that this function works with arrays of a specific type.

Here's where generics come into play. We can use generics to create reusable components that work with multiple types instead of a single one.`,
        authorId: users[1].id,
        views: 89,
        likes: 15,
        image: 'https://picsum.photos/800/400?random=2',
      },
      {
        title: 'Building Scalable Node.js Applications',
        content: `Building scalable Node.js applications requires careful consideration of architecture, performance, and maintainability. In this post, we'll discuss best practices for building robust Node.js applications.

First, let's talk about application structure. A well-organized codebase is crucial for maintainability. Consider using a modular approach where each module has a specific responsibility.

Performance is another critical aspect. Node.js is single-threaded, but it can handle concurrent operations through its event-driven architecture. Understanding how the event loop works is essential for writing efficient Node.js code.

Database optimization is also important. Use connection pooling, implement proper indexing, and consider caching strategies to improve performance.`,
        authorId: users[2].id,
        views: 234,
        likes: 41,
        image: 'https://picsum.photos/800/400?random=3',
      },
      {
        title: 'CSS Grid vs Flexbox: When to Use Which',
        content: `CSS Grid and Flexbox are both powerful layout systems, but they serve different purposes and excel in different scenarios.

Flexbox is designed for one-dimensional layouts – either a row or a column. It's perfect for distributing space along a single axis and aligning items within a container.

CSS Grid, on the other hand, is designed for two-dimensional layouts. It allows you to work with both rows and columns simultaneously, making it ideal for complex layouts.

When should you use Flexbox?
- When you need to align items in a single direction
- For component-level layouts
- When you want items to grow and shrink flexibly
- For centering content

When should you use CSS Grid?
- For complex, two-dimensional layouts
- When you need precise control over both rows and columns
- For page-level layouts
- When you want to overlap elements`,
        authorId: users[3].id,
        views: 178,
        likes: 32,
        image: 'https://picsum.photos/800/400?random=4',
      },
      {
        title: 'Modern JavaScript ES2023 Features',
        content: `JavaScript continues to evolve with new features added regularly. Let's explore some of the exciting features introduced in ES2023.

Array.prototype.toReversed() creates a new array with the elements in reversed order, without modifying the original array. This is useful when you want to reverse an array immutably.

Array.prototype.toSorted() returns a new sorted array without modifying the original. You can provide a comparison function just like with the regular sort method.

Array.prototype.with() allows you to create a new array with a single element changed at a specific index, again without modifying the original array.

These new methods follow the trend of providing immutable alternatives to existing mutable methods, which aligns well with functional programming principles.`,
        authorId: users[0].id,
        views: 142,
        likes: 28,
        image: 'https://picsum.photos/800/400?random=5',
      },
      {
        title: 'Introduction to Web Components',
        content: `Web Components are a set of web platform APIs that allow you to create custom, reusable, encapsulated HTML tags to use in web pages and web apps.

The main technologies behind Web Components are:
1. Custom Elements - Define new HTML elements
2. Shadow DOM - Encapsulated DOM and styling
3. HTML Templates - Reusable markup templates
4. ES Modules - For packaging and distribution

Custom elements allow you to define your own HTML tags. You can create elements that encapsulate functionality and can be reused across different projects and frameworks.

Shadow DOM provides encapsulation for your component's DOM and styles. This means that the internal structure and styling of your component won't interfere with the rest of the page.

HTML templates let you write markup templates that aren't displayed on the page until you decide to use them. This is perfect for defining the structure of your custom elements.`,
        authorId: users[1].id,
        views: 95,
        likes: 19,
        image: 'https://picsum.photos/800/400?random=6',
      },
    ]);

    // Create comments
    await this.commentsRepository.save([
      // Comments for first post
      {
        content: 'Great explanation of React Hooks! This really helped me understand useState better.',
        authorId: users[1].id,
        postId: posts[0].id,
      },
      {
        content: 'I love how hooks make functional components so much more powerful. Thanks for sharing!',
        authorId: users[2].id,
        postId: posts[0].id,
      },
      {
        content: 'Could you write a follow-up post about useContext and useReducer?',
        authorId: users[3].id,
        postId: posts[0].id,
      },
      
      // Comments for second post
      {
        content: 'TypeScript generics were confusing for me until I read this. Much clearer now!',
        authorId: users[0].id,
        postId: posts[1].id,
      },
      {
        content: 'The examples are really helpful. More TypeScript content please!',
        authorId: users[3].id,
        postId: posts[1].id,
      },
      
      // Comments for third post
      {
        content: 'Excellent tips for Node.js scalability. The connection pooling section was particularly useful.',
        authorId: users[0].id,
        postId: posts[2].id,
      },
      {
        content: 'Have you considered writing about microservices architecture with Node.js?',
        authorId: users[1].id,
        postId: posts[2].id,
      },
      {
        content: 'The event loop explanation really helped me understand Node.js performance better.',
        authorId: users[3].id,
        postId: posts[2].id,
      },
      
      // Comments for fourth post
      {
        content: 'Perfect timing! I was just wondering when to use Grid vs Flexbox.',
        authorId: users[0].id,
        postId: posts[3].id,
      },
      {
        content: 'This cleared up so much confusion I had about CSS layouts. Thank you!',
        authorId: users[2].id,
        postId: posts[3].id,
      },
      
      // Comments for fifth post
      {
        content: 'ES2023 features look amazing! Can\'t wait to use toReversed() in my projects.',
        authorId: users[2].id,
        postId: posts[4].id,
      },
      {
        content: 'The immutable array methods are exactly what JavaScript needed.',
        authorId: users[3].id,
        postId: posts[4].id,
      },
      
      // Comments for sixth post
      {
        content: 'Web Components seem like the future of web development. Great introduction!',
        authorId: users[0].id,
        postId: posts[5].id,
      },
      {
        content: 'I\'m excited to try building my own custom elements after reading this.',
        authorId: users[2].id,
        postId: posts[5].id,
      },
    ]);

    console.log('Database seeded successfully!');
  }
}