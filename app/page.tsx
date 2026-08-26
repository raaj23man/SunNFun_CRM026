"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  CheckCircle2,
  Database,
  Layers,
  Lock,
  MoreHorizontal,
  Server,
  Shield,
  Sparkles,
  Terminal,
  Activity,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";

const testFormSchema = z.object({
  agencyName: z.string().min(2, {
    message: "Agency name must be at least 2 characters.",
  }),
  contactEmail: z.string().email({
    message: "Please enter a valid business email address.",
  }),
});

type TestFormValues = z.infer<typeof testFormSchema>;

export default function Home() {
  const [formSubmitted, setFormSubmitted] = React.useState<TestFormValues | null>(
    null
  );

  const form = useForm<TestFormValues>({
    resolver: zodResolver(testFormSchema),
    defaultValues: {
      agencyName: "Sun & Fun Holidays DMC",
      contactEmail: "ops@sunnfunholidays.com",
    },
  });

  function onSubmit(data: TestFormValues) {
    setFormSubmitted(data);
  }

  return (
    <main className="min-h-screen bg-slate-50/50 p-6 md:p-12 text-slate-900">
      <div className="mx-auto max-w-6xl space-y-8">
        {/* Header Section */}
        <header className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between border-b border-slate-200 pb-6">
          <div>
            <div className="flex items-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-600 text-white shadow-md shadow-blue-500/20">
                <Layers className="h-5 w-5" />
              </div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
                Travel CRM SaaS Platform
              </h1>
            </div>
            <p className="mt-1 text-sm text-slate-500">
              Enterprise Multi-Tenant Infrastructure • Next.js 14 App Router •
              Tailwind CSS & Shadcn UI
            </p>
          </div>

          <div className="flex items-center gap-3">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700 ring-1 ring-inset ring-emerald-600/20">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Infrastructure Ready
            </span>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="gap-1.5">
                  Actions
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuLabel>Platform Controls</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => form.reset()}>
                  Reset Form Data
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => alert("Prisma Client Singleton initialized at lib/prisma.ts")}
                >
                  Inspect Prisma Client
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem className="text-blue-600">
                  Documentation (PRD v2)
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <Dialog>
              <DialogTrigger asChild>
                <Button size="sm" className="bg-blue-600 hover:bg-blue-700 gap-1.5 shadow-sm">
                  <Terminal className="h-4 w-4" />
                  Stack Info
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle>Travel CRM Tech Stack</DialogTitle>
                  <DialogDescription>
                    Core infrastructure components configured according to the PRD specification.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-3 py-2 text-sm">
                  <div className="rounded-md bg-slate-100 p-3 font-mono text-xs space-y-1">
                    <div>• Next.js App Router (TypeScript)</div>
                    <div>• Tailwind CSS + Shadcn UI</div>
                    <div>• Prisma ORM (PostgreSQL datasource)</div>
                    <div>• ESLint + Prettier</div>
                    <div>• GitHub Actions CI/CD (Lint & Prisma validate)</div>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </header>

        {/* Feature Cards Grid */}
        <section className="grid gap-4 md:grid-cols-3">
          <Card className="shadow-sm hover:shadow transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Multi-Tenancy Core</CardTitle>
              <Shield className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">Scoped Isolation</div>
              <p className="text-xs text-muted-foreground mt-1">
                Every query is structurally scoped to organization_id per PRD Part 8.
              </p>
            </CardContent>
          </Card>

          <Card className="shadow-sm hover:shadow transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Database Layer</CardTitle>
              <Database className="h-4 w-4 text-emerald-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">Prisma + PostgreSQL</div>
              <p className="text-xs text-muted-foreground mt-1">
                Singleton client configured with DATABASE_URL connection pooling.
              </p>
            </CardContent>
          </Card>

          <Card className="shadow-sm hover:shadow transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">UI Design System</CardTitle>
              <Sparkles className="h-4 w-4 text-purple-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">Shadcn UI Kit</div>
              <p className="text-xs text-muted-foreground mt-1">
                Pre-configured Buttons, Cards, Tables, Forms, Dialogs, Dropdowns & Tabs.
              </p>
            </CardContent>
          </Card>
        </section>

        {/* Main Tabbed Showcase */}
        <Tabs defaultValue="modules" className="w-full">
          <TabsList className="grid w-full grid-cols-2 md:w-[400px]">
            <TabsTrigger value="modules">Platform Modules</TabsTrigger>
            <TabsTrigger value="verification">Form & Validation</TabsTrigger>
          </TabsList>

          {/* Tab 1: Modules Data Table */}
          <TabsContent value="modules" className="space-y-4 pt-4">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-lg">Core Infrastructure Modules</CardTitle>
                    <CardDescription>
                      Status of foundational modules configured in the initial scaffolding.
                    </CardDescription>
                  </div>
                  <Activity className="h-5 w-5 text-slate-400" />
                </div>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[180px]">Module</TableHead>
                      <TableHead>Path / Location</TableHead>
                      <TableHead>Specification Reference</TableHead>
                      <TableHead className="text-right">Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    <TableRow>
                      <TableCell className="font-medium flex items-center gap-2">
                        <Server className="h-4 w-4 text-blue-500" />
                        Prisma Client Singleton
                      </TableCell>
                      <TableCell className="font-mono text-xs">/lib/prisma.ts</TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        PRD Part 8 • Datasource PG
                      </TableCell>
                      <TableCell className="text-right">
                        <span className="inline-flex items-center gap-1 text-emerald-600 text-xs font-semibold">
                          <CheckCircle2 className="h-3.5 w-3.5" /> Ready
                        </span>
                      </TableCell>
                    </TableRow>

                    <TableRow>
                      <TableCell className="font-medium flex items-center gap-2">
                        <Lock className="h-4 w-4 text-purple-500" />
                        Env Template
                      </TableCell>
                      <TableCell className="font-mono text-xs">/.env.example</TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        PRD Part 8 Section E
                      </TableCell>
                      <TableCell className="text-right">
                        <span className="inline-flex items-center gap-1 text-emerald-600 text-xs font-semibold">
                          <CheckCircle2 className="h-3.5 w-3.5" /> Configured
                        </span>
                      </TableCell>
                    </TableRow>

                    <TableRow>
                      <TableCell className="font-medium flex items-center gap-2">
                        <Layers className="h-4 w-4 text-amber-500" />
                        Shadcn UI Suite
                      </TableCell>
                      <TableCell className="font-mono text-xs">/components/ui/*</TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        Button, Card, Table, Dialog, etc.
                      </TableCell>
                      <TableCell className="text-right">
                        <span className="inline-flex items-center gap-1 text-emerald-600 text-xs font-semibold">
                          <CheckCircle2 className="h-3.5 w-3.5" /> Installed
                        </span>
                      </TableCell>
                    </TableRow>

                    <TableRow>
                      <TableCell className="font-medium flex items-center gap-2">
                        <Terminal className="h-4 w-4 text-cyan-500" />
                        CI/CD Pipeline
                      </TableCell>
                      <TableCell className="font-mono text-xs">
                        /.github/workflows/deploy.yml
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        Lint + Prisma Validate + Vercel CD
                      </TableCell>
                      <TableCell className="text-right">
                        <span className="inline-flex items-center gap-1 text-emerald-600 text-xs font-semibold">
                          <CheckCircle2 className="h-3.5 w-3.5" /> Configured
                        </span>
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Tab 2: Form & Validation */}
          <TabsContent value="verification" className="space-y-4 pt-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Form Validation Test (Zod + React Hook Form)</CardTitle>
                <CardDescription>
                  Verifies that Shadcn UI form components, reactive state, and Zod validation run correctly.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Form {...form}>
                  <form
                    onSubmit={form.handleSubmit(onSubmit)}
                    className="space-y-4 max-w-lg"
                  >
                    <FormField
                      control={form.control}
                      name="agencyName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Travel Agency Name</FormLabel>
                          <FormControl>
                            <Input placeholder="e.g. Sun & Fun Holidays" {...field} />
                          </FormControl>
                          <FormDescription>
                            Organization name for multi-tenant tenant registration.
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="contactEmail"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Primary Contact Email</FormLabel>
                          <FormControl>
                            <Input placeholder="admin@agency.com" {...field} />
                          </FormControl>
                          <FormDescription>
                            Used for admin authentication and notification dispatch.
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <Button type="submit" className="bg-blue-600 hover:bg-blue-700">
                      Submit Test Verification
                    </Button>
                  </form>
                </Form>

                {formSubmitted && (
                  <div className="mt-6 rounded-md bg-emerald-50 p-4 border border-emerald-200">
                    <h4 className="text-sm font-semibold text-emerald-800 flex items-center gap-1.5">
                      <CheckCircle2 className="h-4 w-4" /> Form Submission Verified
                    </h4>
                    <p className="text-xs text-emerald-700 mt-1">
                      Agency: <strong>{formSubmitted.agencyName}</strong> • Email:{" "}
                      <strong>{formSubmitted.contactEmail}</strong>
                    </p>
                  </div>
                )}
              </CardContent>
              <CardFooter className="border-t border-slate-100 bg-slate-50/50 py-3 text-xs text-muted-foreground">
                Zod schema validated on the client side with typed resolver.
              </CardFooter>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </main>
  );
}
