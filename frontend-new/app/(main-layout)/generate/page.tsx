"use client";

import { useState } from "react";
import {
  ArrowLeft,
  Play,
  Copy,
  Download,
  Eye,
  Code2,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import Link from "next/link";
import TopHeader from "@/components/ui/TopHeader";

interface ProjectOptions {
  framework: string;
  styling: string;
  features: string[];
  projectName: string;
  description: string;
  template: string;
}

const frameworks = [
  {
    id: "react",
    name: "React",
    description: "Modern React with hooks and functional components",
  },
  {
    id: "nextjs",
    name: "Next.js",
    description: "Full-stack React framework with SSR and routing",
  },
  {
    id: "vue",
    name: "Vue.js",
    description: "Progressive JavaScript framework",
  },
  {
    id: "vanilla",
    name: "Vanilla JS",
    description: "Pure JavaScript without frameworks",
  },
];

const stylingOptions = [
  {
    id: "tailwind",
    name: "Tailwind CSS",
    description: "Utility-first CSS framework",
  },
  {
    id: "css-modules",
    name: "CSS Modules",
    description: "Scoped CSS with modules",
  },
  {
    id: "styled-components",
    name: "Styled Components",
    description: "CSS-in-JS styling",
  },
  {
    id: "vanilla-css",
    name: "Vanilla CSS",
    description: "Plain CSS stylesheets",
  },
];

const featureOptions = [
  { id: "routing", name: "Routing", description: "Client-side navigation" },
  {
    id: "state-management",
    name: "State Management",
    description: "Global state handling",
  },
  {
    id: "api-integration",
    name: "API Integration",
    description: "REST API calls and data fetching",
  },
  {
    id: "authentication",
    name: "Authentication",
    description: "User login and registration",
  },
  { id: "database", name: "Database", description: "Data persistence layer" },
  { id: "testing", name: "Testing", description: "Unit and integration tests" },
];

const templates = [
  {
    id: "landing-page",
    name: "Landing Page",
    description: "Marketing website with hero and features",
  },
  {
    id: "dashboard",
    name: "Dashboard",
    description: "Admin panel with charts and tables",
  },
  {
    id: "blog",
    name: "Blog",
    description: "Content management and article display",
  },
  {
    id: "ecommerce",
    name: "E-commerce",
    description: "Online store with cart and checkout",
  },
  {
    id: "portfolio",
    name: "Portfolio",
    description: "Personal showcase website",
  },
  {
    id: "custom",
    name: "Custom",
    description: "Start from scratch with your specifications",
  },
];

export default function GeneratePage() {
  const [step, setStep] = useState(1);
  const [options, setOptions] = useState<ProjectOptions>({
    framework: "",
    styling: "",
    features: [],
    projectName: "",
    description: "",
    template: "",
  });
  const [generatedCode, setGeneratedCode] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [activeTab, setActiveTab] = useState("preview");

  const handleFeatureToggle = (featureId: string) => {
    setOptions((prev) => ({
      ...prev,
      features: prev.features.includes(featureId)
        ? prev.features.filter((f) => f !== featureId)
        : [...prev.features, featureId],
    }));
  };

  const generateCode = async () => {
    setIsGenerating(true);

    // Simulate code generation
    await new Promise((resolve) => setTimeout(resolve, 2000));

    const code = `// Generated ${options.framework} project: ${
      options.projectName
    }
// Template: ${options.template}
// Styling: ${options.styling}
// Features: ${options.features.join(", ")}

import React from 'react';
${options.styling === "tailwind" ? "import './globals.css';" : ""}

function App() {
  return (
    <div className="${
      options.styling === "tailwind"
        ? "min-h-screen bg-gray-50 flex items-center justify-center"
        : "app"
    }">
      <div className="${
        options.styling === "tailwind" ? "max-w-4xl mx-auto p-8" : "container"
      }">
        <header className="${
          options.styling === "tailwind" ? "text-center mb-12" : "header"
        }">
          <h1 className="${
            options.styling === "tailwind"
              ? "text-4xl font-bold text-gray-900 mb-4"
              : "title"
          }">
            ${options.projectName}
          </h1>
          <p className="${
            options.styling === "tailwind"
              ? "text-xl text-gray-600"
              : "description"
          }">
            ${options.description}
          </p>
        </header>

        <main className="${
          options.styling === "tailwind"
            ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8"
            : "main"
        }">
          ${options.features
            .map(
              (feature) => `
          <div className="${
            options.styling === "tailwind"
              ? "bg-white p-6 rounded-lg shadow-md"
              : "feature-card"
          }">
            <h3 className="${
              options.styling === "tailwind"
                ? "text-lg font-semibold mb-2"
                : "feature-title"
            }">
              ${feature
                .replace("-", " ")
                .replace(/\b\w/g, (l) => l.toUpperCase())}
            </h3>
            <p className="${
              options.styling === "tailwind"
                ? "text-gray-600"
                : "feature-description"
            }">
              Feature implementation for ${feature}
            </p>
          </div>`
            )
            .join("")}
        </main>

        ${
          options.features.includes("api-integration")
            ? `
        <section className="${
          options.styling === "tailwind"
            ? "mt-12 p-6 bg-blue-50 rounded-lg"
            : "api-section"
        }">
          <h2 className="${
            options.styling === "tailwind"
              ? "text-2xl font-bold mb-4"
              : "api-title"
          }">API Integration</h2>
          <p className="${
            options.styling === "tailwind" ? "text-gray-700" : "api-description"
          }">
            Ready for API integration with fetch calls and data management.
          </p>
        </section>`
            : ""
        }
      </div>
    </div>
  );
}

export default App;`;

    setGeneratedCode(code);
    setIsGenerating(false);
    setStep(3);
  };

  const copyCode = () => {
    navigator.clipboard.writeText(generatedCode);
  };

  const downloadCode = () => {
    const blob = new Blob([generatedCode], { type: "text/javascript" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${options.projectName || "generated-project"}.js`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <TopHeader>
        <div className="flex w-full h-full items-center justify-center">
          Get started with website builder
        </div>
      </TopHeader>

      <div className="container max-w-6xl mx-auto px-4 py-8">
        {/* Progress Steps */}
        <div className="flex items-center justify-center mb-8">
          <div className="flex items-center space-x-4">
            {[1, 2, 3].map((stepNum) => (
              <div key={stepNum} className="flex items-center">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors ${
                    step >= stepNum
                      ? "bg-primary text-primary-foreground"
                      : "bg-gray-200 text-gray-600"
                  }`}
                >
                  {stepNum}
                </div>
                {stepNum < 3 && (
                  <div
                    className={`w-12 h-0.5 mx-2 transition-colors ${
                      step > stepNum ? "bg-primary" : "bg-gray-200"
                    }`}
                  />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Step 1: Project Configuration */}
        {step === 1 && (
          <div className="max-w-4xl mx-auto space-y-8">
            <div className="text-center space-y-4">
              <h1 className="text-3xl font-bold">Configure Your Project</h1>
              <p className="text-xl text-muted-foreground">
                Choose your framework, styling, and features to generate your
                perfect starter code
              </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Project Details */}
              <Card>
                <CardHeader>
                  <CardTitle>Project Details</CardTitle>
                  <CardDescription>
                    Basic information about your project
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label htmlFor="projectName">Project Name</Label>
                    <Input
                      id="projectName"
                      placeholder="My Awesome Project"
                      value={options.projectName}
                      onChange={(e) =>
                        setOptions((prev) => ({
                          ...prev,
                          projectName: e.target.value,
                        }))
                      }
                    />
                  </div>
                  <div>
                    <Label htmlFor="description">Description</Label>
                    <Textarea
                      id="description"
                      placeholder="A brief description of your project..."
                      value={options.description}
                      onChange={(e) =>
                        setOptions((prev) => ({
                          ...prev,
                          description: e.target.value,
                        }))
                      }
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Template Selection */}
              <Card>
                <CardHeader>
                  <CardTitle>Template</CardTitle>
                  <CardDescription>Choose a starting template</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 gap-3">
                    {templates.map((template) => (
                      <div
                        key={template.id}
                        className={`p-3 border rounded-lg cursor-pointer transition-all hover:border-primary/50 ${
                          options.template === template.id
                            ? "border-primary bg-primary/5"
                            : "border-border"
                        }`}
                        onClick={() =>
                          setOptions((prev) => ({
                            ...prev,
                            template: template.id,
                          }))
                        }
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <h4 className="font-medium">{template.name}</h4>
                            <p className="text-sm text-muted-foreground">
                              {template.description}
                            </p>
                          </div>
                          {options.template === template.id && (
                            <Badge variant="default">Selected</Badge>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Framework Selection */}
            <Card>
              <CardHeader>
                <CardTitle>Framework</CardTitle>
                <CardDescription>
                  Select your preferred JavaScript framework
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  {frameworks.map((framework) => (
                    <div
                      key={framework.id}
                      className={`p-4 border rounded-lg cursor-pointer transition-all hover:border-primary/50 ${
                        options.framework === framework.id
                          ? "border-primary bg-primary/5"
                          : "border-border"
                      }`}
                      onClick={() =>
                        setOptions((prev) => ({
                          ...prev,
                          framework: framework.id,
                        }))
                      }
                    >
                      <h4 className="font-medium mb-2">{framework.name}</h4>
                      <p className="text-sm text-muted-foreground">
                        {framework.description}
                      </p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Styling Options */}
            <Card>
              <CardHeader>
                <CardTitle>Styling</CardTitle>
                <CardDescription>Choose your CSS approach</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  {stylingOptions.map((styling) => (
                    <div
                      key={styling.id}
                      className={`p-4 border rounded-lg cursor-pointer transition-all hover:border-primary/50 ${
                        options.styling === styling.id
                          ? "border-primary bg-primary/5"
                          : "border-border"
                      }`}
                      onClick={() =>
                        setOptions((prev) => ({ ...prev, styling: styling.id }))
                      }
                    >
                      <h4 className="font-medium mb-2">{styling.name}</h4>
                      <p className="text-sm text-muted-foreground">
                        {styling.description}
                      </p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Features */}
            <Card>
              <CardHeader>
                <CardTitle>Features</CardTitle>
                <CardDescription>
                  Select the features you want to include
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {featureOptions.map((feature) => (
                    <div
                      key={feature.id}
                      className="flex items-start space-x-3 p-3 border rounded-lg"
                    >
                      <Checkbox
                        id={feature.id}
                        checked={options.features.includes(feature.id)}
                        onCheckedChange={() => handleFeatureToggle(feature.id)}
                      />
                      <div className="flex-1">
                        <Label
                          htmlFor={feature.id}
                          className="font-medium cursor-pointer"
                        >
                          {feature.name}
                        </Label>
                        <p className="text-sm text-muted-foreground mt-1">
                          {feature.description}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <div className="flex justify-center">
              <Button
                size="lg"
                onClick={() => setStep(2)}
                disabled={
                  !options.framework || !options.styling || !options.template
                }
                className="px-8"
              >
                Continue to Review
                <Sparkles className="h-4 w-4 ml-2" />
              </Button>
            </div>
          </div>
        )}

        {/* Step 2: Review Configuration */}
        {step === 2 && (
          <div className="max-w-4xl mx-auto space-y-8">
            <div className="text-center space-y-4">
              <h1 className="text-3xl font-bold">Review Your Configuration</h1>
              <p className="text-xl text-muted-foreground">
                Double-check your selections before generating the code
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Project Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">
                      Name
                    </Label>
                    <p className="font-medium">
                      {options.projectName || "Untitled Project"}
                    </p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">
                      Description
                    </Label>
                    <p className="text-sm">
                      {options.description || "No description provided"}
                    </p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">
                      Template
                    </Label>
                    <p className="font-medium">
                      {templates.find((t) => t.id === options.template)?.name}
                    </p>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Technical Stack</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">
                      Framework
                    </Label>
                    <p className="font-medium">
                      {frameworks.find((f) => f.id === options.framework)?.name}
                    </p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">
                      Styling
                    </Label>
                    <p className="font-medium">
                      {
                        stylingOptions.find((s) => s.id === options.styling)
                          ?.name
                      }
                    </p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">
                      Features
                    </Label>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {options.features.map((featureId) => (
                        <Badge
                          key={featureId}
                          variant="secondary"
                          className="text-xs"
                        >
                          {featureOptions.find((f) => f.id === featureId)?.name}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="flex justify-center space-x-4">
              <Button variant="outline" onClick={() => setStep(1)}>
                Back to Configure
              </Button>
              <Button
                size="lg"
                onClick={generateCode}
                disabled={isGenerating}
                className="px-8"
              >
                {isGenerating ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                    Generating...
                  </>
                ) : (
                  <>
                    Generate Code
                    <Code2 className="h-4 w-4 ml-2" />
                  </>
                )}
              </Button>
            </div>
          </div>
        )}

        {/* Step 3: Generated Code */}
        {step === 3 && (
          <div className="max-w-7xl mx-auto space-y-6">
            <div className="text-center space-y-4">
              <h1 className="text-3xl font-bold">Your Code is Ready!</h1>
              <p className="text-xl text-muted-foreground">
                Preview, copy, or download your generated project
              </p>
            </div>

            <Tabs
              value={activeTab}
              onValueChange={setActiveTab}
              className="w-full"
            >
              <div className="flex items-center justify-between mb-4">
                <TabsList className="grid w-full max-w-md grid-cols-2">
                  <TabsTrigger
                    value="preview"
                    className="flex items-center space-x-2"
                  >
                    <Eye className="h-4 w-4" />
                    <span>Preview</span>
                  </TabsTrigger>
                  <TabsTrigger
                    value="code"
                    className="flex items-center space-x-2"
                  >
                    <Code2 className="h-4 w-4" />
                    <span>Code</span>
                  </TabsTrigger>
                </TabsList>

                <div className="flex items-center space-x-2">
                  <Button variant="outline" size="sm" onClick={copyCode}>
                    <Copy className="h-4 w-4 mr-2" />
                    Copy Code
                  </Button>
                  <Button variant="outline" size="sm" onClick={downloadCode}>
                    <Download className="h-4 w-4 mr-2" />
                    Download
                  </Button>
                  <Button size="sm">
                    <Play className="h-4 w-4 mr-2" />
                    Run Code
                  </Button>
                </div>
              </div>

              <TabsContent value="preview" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Live Preview</CardTitle>
                    <CardDescription>
                      See how your generated project will look
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="border rounded-lg p-8 bg-white min-h-96">
                      <div className="max-w-4xl mx-auto">
                        <header className="text-center mb-12">
                          <h1 className="text-4xl font-bold text-gray-900 mb-4">
                            {options.projectName || "Generated Project"}
                          </h1>
                          <p className="text-xl text-gray-600">
                            {options.description ||
                              "Your generated project description"}
                          </p>
                        </header>

                        <main className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                          {options.features.map((feature) => (
                            <div
                              key={feature}
                              className="bg-gray-50 p-6 rounded-lg"
                            >
                              <h3 className="text-lg font-semibold mb-2">
                                {feature
                                  .replace("-", " ")
                                  .replace(/\b\w/g, (l) => l.toUpperCase())}
                              </h3>
                              <p className="text-gray-600">
                                Feature implementation for {feature}
                              </p>
                            </div>
                          ))}
                        </main>

                        {options.features.includes("api-integration") && (
                          <section className="mt-12 p-6 bg-blue-50 rounded-lg">
                            <h2 className="text-2xl font-bold mb-4">
                              API Integration
                            </h2>
                            <p className="text-gray-700">
                              Ready for API integration with fetch calls and
                              data management.
                            </p>
                          </section>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="code" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Generated Code</CardTitle>
                    <CardDescription>
                      Your complete project code ready to use
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="relative">
                      <pre className="bg-gray-900 text-gray-100 p-6 rounded-lg overflow-x-auto text-sm">
                        <code>{generatedCode}</code>
                      </pre>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>

            <div className="flex justify-center space-x-4">
              <Button variant="outline" onClick={() => setStep(1)}>
                Generate Another
              </Button>
              <Link href="/">
                <Button variant="outline">Back to Home</Button>
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
