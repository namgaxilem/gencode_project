import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  ArrowRight,
  Check,
  Github,
  Globe,
  Shield,
  Smartphone,
  Users,
  Zap,
} from "lucide-react";
import Link from "next/link";

const features = [
  {
    icon: Zap,
    title: "Lightning Fast",
    description:
      "Built with Next.js 15 and optimized for performance with cutting-edge bundling.",
  },
  {
    icon: Shield,
    title: "Type Safe",
    description:
      "Full TypeScript support with strict type checking and modern development practices.",
  },
  {
    icon: Smartphone,
    title: "Mobile First",
    description:
      "Responsive design that works perfectly across all devices and screen sizes.",
  },
  {
    icon: Users,
    title: "Team Ready",
    description:
      "Collaborative development with modern tooling and best practices built-in.",
  },
];

const testimonials = [
  {
    quote:
      "The developer experience is absolutely incredible. Everything just works.",
    author: "Sarah Chen",
    role: "Frontend Engineer",
    company: "Acme Corp",
  },
  {
    quote:
      "Deployment was seamless. From local development to production in minutes.",
    author: "Marcus Johnson",
    role: "Tech Lead",
    company: "StartupXYZ",
  },
];

export default function Home() {
  return (
    <div className="flex flex-col min-h-screen">
      {/* Navigation */}
      <nav className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container max-w-7xl mx-auto flex h-16 items-center justify-between px-4">
          <div className="flex items-center space-x-2">
            <div className="flex h-6 w-6 items-center justify-center rounded-md bg-primary text-primary-foreground">
              <Globe className="h-4 w-4" />
            </div>
            <span className="font-bold text-xl">Vercel v0</span>
          </div>

          <div className="hidden md:flex items-center space-x-6">
            <a
              href="#features"
              className="text-sm font-medium text-muted-foreground hover:text-primary transition-colors"
            >
              Features
            </a>
            <a
              href="#testimonials"
              className="text-sm font-medium text-muted-foreground hover:text-primary transition-colors"
            >
              Testimonials
            </a>
            <a
              href="#docs"
              className="text-sm font-medium text-muted-foreground hover:text-primary transition-colors"
            >
              Docs
            </a>
          </div>

          <div className="flex items-center space-x-2">
            <Button variant="ghost" size="sm">
              <Github className="h-4 w-4 mr-2" />
              GitHub
            </Button>
            <Link href="/generate">
              <Button size="sm">
                Get Started
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative py-20 md:py-32 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-secondary/5" />
        <div className="container max-w-7xl mx-auto px-4 relative">
          <div className="flex flex-col items-center text-center space-y-8">
            <Badge variant="secondary" className="rounded-full px-4 py-1.5">
              <Zap className="h-3 w-3 mr-1.5" />
              Now with Next.js 15
            </Badge>

            <div className="space-y-4 max-w-4xl">
              <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold tracking-tight">
                Build the future with{" "}
                <span className="bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
                  modern web
                </span>
              </h1>
              <p className="text-xl md:text-2xl text-muted-foreground max-w-2xl mx-auto">
                Create exceptional user experiences with Next.js 15, TypeScript,
                and Tailwind CSS. Ship faster with our production-ready
                template.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-4">
              <Link href="/generate">
                <Button size="lg" className="text-base">
                  Start Building
                  <ArrowRight className="h-5 w-5 ml-2" />
                </Button>
              </Link>
              <Button variant="outline" size="lg" className="text-base">
                View Demo
                <Github className="h-5 w-5 ml-2" />
              </Button>
            </div>

            <div className="flex items-center space-x-6 text-sm text-muted-foreground">
              <div className="flex items-center space-x-1">
                <Check className="h-4 w-4 text-green-500" />
                <span>No credit card required</span>
              </div>
              <div className="flex items-center space-x-1">
                <Check className="h-4 w-4 text-green-500" />
                <span>Open source</span>
              </div>
              <div className="flex items-center space-x-1">
                <Check className="h-4 w-4 text-green-500" />
                <span>Deploy anywhere</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 md:py-32 bg-muted/20">
        <div className="container max-w-7xl mx-auto px-4">
          <div className="text-center space-y-4 mb-16">
            <h2 className="text-3xl md:text-5xl font-bold tracking-tight">
              Everything you need to ship
            </h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Built with the latest technologies and best practices to help you
              create amazing applications that scale.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {features.map((feature, index) => (
              <Card
                key={index}
                className="relative group hover:shadow-lg transition-all duration-300 border-0 bg-background/50 backdrop-blur-sm"
              >
                <CardHeader className="pb-4">
                  <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-colors">
                    <feature.icon className="h-6 w-6 text-primary" />
                  </div>
                  <CardTitle className="text-xl">{feature.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription className="text-base leading-relaxed">
                    {feature.description}
                  </CardDescription>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section id="testimonials" className="py-20 md:py-32">
        <div className="container max-w-7xl mx-auto px-4">
          <div className="text-center space-y-4 mb-16">
            <h2 className="text-3xl md:text-5xl font-bold tracking-tight">
              Loved by developers
            </h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              See what teams around the world are building with our platform.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            {testimonials.map((testimonial, index) => (
              <Card key={index} className="relative">
                <CardContent className="pt-6">
                  <div className="space-y-4">
                    <p className="text-lg leading-relaxed">
                      "{testimonial.quote}"
                    </p>
                    <div className="flex items-center space-x-3">
                      <div className="h-10 w-10 rounded-full bg-gradient-to-r from-primary to-primary/60" />
                      <div>
                        <p className="font-semibold">{testimonial.author}</p>
                        <p className="text-sm text-muted-foreground">
                          {testimonial.role} at {testimonial.company}
                        </p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 md:py-32 bg-primary text-primary-foreground">
        <div className="container max-w-7xl mx-auto px-4">
          <div className="text-center space-y-8">
            <h2 className="text-3xl md:text-5xl font-bold tracking-tight">
              Ready to get started?
            </h2>
            <p className="text-xl opacity-90 max-w-2xl mx-auto">
              Join thousands of developers building the next generation of web
              applications.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/generate">
                <Button size="lg" variant="secondary" className="text-base">
                  Start Building Now
                  <ArrowRight className="h-5 w-5 ml-2" />
                </Button>
              </Link>
              <Button
                size="lg"
                variant="outline"
                className="text-base border-primary-foreground/20 text-primary-foreground hover:bg-primary-foreground/10"
              >
                Read the Docs
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t bg-muted/20">
        <div className="container max-w-7xl mx-auto px-4 py-12">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div className="space-y-4">
              <div className="flex items-center space-x-2">
                <div className="flex h-6 w-6 items-center justify-center rounded-md bg-primary text-primary-foreground">
                  <Globe className="h-4 w-4" />
                </div>
                <span className="font-bold">Vercel v0</span>
              </div>
              <p className="text-sm text-muted-foreground">
                Building the future of web development, one component at a time.
              </p>
            </div>

            <div className="space-y-4">
              <h3 className="font-semibold">Product</h3>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>
                  <a href="#" className="hover:text-primary transition-colors">
                    Features
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-primary transition-colors">
                    Pricing
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-primary transition-colors">
                    Templates
                  </a>
                </li>
              </ul>
            </div>

            <div className="space-y-4">
              <h3 className="font-semibold">Resources</h3>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>
                  <a href="#" className="hover:text-primary transition-colors">
                    Documentation
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-primary transition-colors">
                    Examples
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-primary transition-colors">
                    Blog
                  </a>
                </li>
              </ul>
            </div>

            <div className="space-y-4">
              <h3 className="font-semibold">Community</h3>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>
                  <a href="#" className="hover:text-primary transition-colors">
                    GitHub
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-primary transition-colors">
                    Discord
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-primary transition-colors">
                    Twitter
                  </a>
                </li>
              </ul>
            </div>
          </div>

          <div className="mt-12 pt-8 border-t border-border/40 flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0">
            <p className="text-sm text-muted-foreground">
              © 2025 Vercel v0 Inspired. All rights reserved.
            </p>
            <div className="flex items-center space-x-4 text-sm text-muted-foreground">
              <a href="#" className="hover:text-primary transition-colors">
                Privacy Policy
              </a>
              <a href="#" className="hover:text-primary transition-colors">
                Terms of Service
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
