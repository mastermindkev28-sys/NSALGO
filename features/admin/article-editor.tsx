"use client";

import { useState } from "react";
import { ActionForm } from "@/components/admin/action-form";
import { Checkbox, Input, Label, Select, Textarea } from "@/components/ui/controls";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/controls";
import { renderMarkdown } from "@/lib/markdown";
import type { EducationArticle, EducationCategory } from "@/types/domain";
import { saveArticleAction } from "./actions";

/** Education CMS editor with live preview (restricted Markdown, rendered safely). */
export function ArticleEditor({ article, categories }: { article?: EducationArticle; categories: EducationCategory[] }) {
  const [content, setContent] = useState(article?.content ?? "## Section heading\n\nWrite the lesson here. Use **bold**, lists and [links](https://example.com).");
  const [title, setTitle] = useState(article?.title ?? "");
  const [slugVal, setSlugVal] = useState(article?.slug ?? "");
  const autoSlug = (t: string) => t.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 80);
  return (
    <ActionForm action={saveArticleAction} submitLabel={article ? "Save changes" : "Create article"}>
      {article ? <input type="hidden" name="id" value={article.id} /> : null}
      <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
        <div className="space-y-4">
          <div>
            <Label htmlFor="title">Title</Label>
            <Input id="title" name="title" value={title} onChange={(e) => { setTitle(e.target.value); if (!article) setSlugVal(autoSlug(e.target.value)); }} required maxLength={140} />
          </div>
          <div>
            <Label htmlFor="description">Description</Label>
            <Textarea id="description" name="description" defaultValue={article?.description} required rows={2} maxLength={300} />
          </div>
          <Tabs defaultValue="write">
            <TabsList>
              <TabsTrigger value="write">Write</TabsTrigger>
              <TabsTrigger value="preview">Preview</TabsTrigger>
            </TabsList>
            <TabsContent value="write" className="pt-3">
              <Textarea name="content" value={content} onChange={(e) => setContent(e.target.value)} rows={22} className="font-mono text-[12.5px]" required />
              <p className="mt-1.5 text-[11px] text-steel-500">Supported: ## / ### headings, paragraphs, - and 1. lists, &gt; quotes, | tables |, **bold**, *italic*, `code`, [links](https://…). Raw HTML is not rendered.</p>
            </TabsContent>
            <TabsContent value="preview" className="pt-3">
              <div className="prose-nsalgo min-h-80 rounded-md border border-line bg-graphite-950 p-5">{renderMarkdown(content)}</div>
            </TabsContent>
          </Tabs>
        </div>
        <div className="space-y-4">
          <div>
            <Label htmlFor="slug">Slug</Label>
            <Input id="slug" name="slug" value={slugVal} onChange={(e) => setSlugVal(e.target.value)} required maxLength={80} />
          </div>
          <div>
            <Label htmlFor="categorySlug">Category</Label>
            <Select id="categorySlug" name="categorySlug" defaultValue={article?.categorySlug ?? categories[0]?.slug}>
              {categories.map((c) => <option key={c.slug} value={c.slug}>{c.name}</option>)}
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="difficulty">Difficulty</Label>
              <Select id="difficulty" name="difficulty" defaultValue={article?.difficulty ?? "foundational"}>
                <option value="foundational">Foundational</option>
                <option value="intermediate">Intermediate</option>
                <option value="advanced">Advanced</option>
              </Select>
            </div>
            <div>
              <Label htmlFor="readMinutes">Read time (min)</Label>
              <Input id="readMinutes" name="readMinutes" type="number" min={1} max={120} defaultValue={article?.readMinutes ?? 5} />
            </div>
          </div>
          <div>
            <Label htmlFor="authorName">Author</Label>
            <Input id="authorName" name="authorName" defaultValue={article?.authorName ?? "NSALGO Research"} required />
          </div>
          <div>
            <Label htmlFor="featuredImage">Featured image URL</Label>
            <Input id="featuredImage" name="featuredImage" type="url" defaultValue={article?.featuredImage ?? ""} placeholder="https://…" />
          </div>
          <div>
            <Label htmlFor="relatedSlugs">Related content (slugs)</Label>
            <Input id="relatedSlugs" name="relatedSlugs" defaultValue={article?.relatedSlugs.join(", ")} placeholder="invalidation-first, …" />
          </div>
          <div>
            <Label htmlFor="status">Status</Label>
            <Select id="status" name="status" defaultValue={article?.status ?? "draft"}>
              <option value="draft">Draft</option>
              <option value="published">Published</option>
            </Select>
          </div>
          <label className="flex items-center gap-2 text-[13px] text-steel-300">
            <Checkbox name="featured" defaultChecked={article?.featured} /> Feature on homepage & library
          </label>
        </div>
      </div>
    </ActionForm>
  );
}
