import { Component, OnInit, signal, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { ContentService } from '../../../core/services/content.service';
import { TechnologyService } from '../../../core/services/technology.service';
import { ToastService } from '../../../core/services/toast.service';
import type { ContentFormData, ContentType, Difficulty, BodyBlock } from '../../../core/models/content.model';
import type { TechnologyDomain, Company, Tag } from '../../../core/models/technology.model';

@Component({
  selector: 'app-contributor-content-form',
  standalone: true,
  imports: [FormsModule, RouterLink],
  templateUrl: './content-form.component.html',
  styleUrl: './content-form.component.css',
})
export class ContributorContentFormComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private contentService = inject(ContentService);
  private techService = inject(TechnologyService);
  private toast = inject(ToastService);

  editId = signal<string | null>(null);
  loading = signal(false);
  saving = signal(false);

  title = signal('');
  bodyText = signal('');
  contentType = signal<ContentType>('QUESTION');
  difficulty = signal<Difficulty | ''>('');
  codeSnippet = signal('');
  codeLanguage = signal('');
  selectedTechIds = signal<string[]>([]);
  selectedCompanyIds = signal<string[]>([]);
  selectedTagIds = signal<string[]>([]);

  domains = signal<TechnologyDomain[]>([]);
  companies = signal<Company[]>([]);
  tags = signal<Tag[]>([]);

  contentTypes: { value: ContentType; label: string }[] = [
    { value: 'QUESTION', label: 'Interview Question' },
    { value: 'CONCEPT', label: 'Concept' },
    { value: 'NOTE', label: 'Note' },
    { value: 'CODE_EXAMPLE', label: 'Code Example' },
    { value: 'CHEAT_SHEET', label: 'Cheat Sheet' },
    { value: 'INTERVIEW_EXPERIENCE', label: 'Interview Experience' },
    { value: 'PREPARATION_GUIDE', label: 'Preparation Guide' },
    { value: 'SYSTEM_DESIGN', label: 'System Design' },
    { value: 'DSA', label: 'DSA' },
  ];

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.editId.set(id);
      this.loadContent(id);
    }
    this.loadMetadata();
  }

  private async loadMetadata(): Promise<void> {
    try {
      const [domains, companies, tags] = await Promise.all([
        this.techService.getTechnologies(),
        this.techService.getCompanies(),
        this.techService.getTags(),
      ]);
      this.domains.set(domains);
      this.companies.set(companies);
      this.tags.set(tags);
    } catch { /* best-effort */ }
  }

  private async loadContent(id: string): Promise<void> {
    this.loading.set(true);
    try {
      const content = await this.contentService.getContributorContentById(id);
      this.title.set(content.title);
      this.bodyText.set(this.blocksToText(this.parseBodyToBlocks(content.body)));
      this.contentType.set(content.contentType);
      this.difficulty.set(content.difficulty || '');
      this.codeSnippet.set(content.codeSnippet || '');
      this.codeLanguage.set(content.codeLanguage || '');
      this.selectedTechIds.set(content.technologies.map(t => t.id));
      this.selectedCompanyIds.set(content.companies.map(c => c.id));
      this.selectedTagIds.set(content.tags.map(t => t.id));
    } catch {
      this.toast.error('Failed to load content.');
    } finally {
      this.loading.set(false);
    }
  }

  private parseBodyToBlocks(body: string): BodyBlock[] {
    try {
      const parsed = JSON.parse(body);
      if (Array.isArray(parsed)) {
        if (parsed.length > 0 && typeof parsed[0] === 'object' && parsed[0].type) {
          return parsed as BodyBlock[];
        }
        return parsed.map((s: string) => ({ type: 'text' as const, content: s }));
      }
    } catch { /* not JSON */ }
    return [{ type: 'text', content: body }];
  }

  private blocksToText(blocks: BodyBlock[]): string {
    return blocks.map(b => {
      if (b.type === 'heading') return '# ' + b.content;
      if (b.type === 'code') return '` ' + b.content;
      if (b.type === 'list') return (b.content as string[]).map(item => '- ' + item).join('\n');
      return String(b.content);
    }).join('\n');
  }

  private parseTextToBlocks(text: string): BodyBlock[] {
    const lines = text.split('\n');
    const blocks: BodyBlock[] = [];
    let listItems: string[] | null = null;
    for (const line of lines) {
      if (line.startsWith('- ')) {
        if (!listItems) listItems = [];
        listItems.push(line.slice(2));
      } else {
        if (listItems) { blocks.push({ type: 'list', content: listItems }); listItems = null; }
        if (line.startsWith('# ')) blocks.push({ type: 'heading', content: line.slice(2) });
        else if (line.startsWith('` ')) blocks.push({ type: 'code', content: line.slice(2) });
        else if (line.trim()) blocks.push({ type: 'text', content: line });
      }
    }
    if (listItems) blocks.push({ type: 'list', content: listItems });
    return blocks;
  }

  insertFormat(type: string, textarea: HTMLTextAreaElement): void {
    const text = this.bodyText();
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const lineStart = text.lastIndexOf('\n', start - 1) + 1;
    let lineEnd = text.indexOf('\n', end);
    if (lineEnd === -1) lineEnd = text.length;
    const line = text.substring(lineStart, lineEnd);
    const prefixMap: Record<string, string> = { heading: '# ', list: '- ', code: '` ' };
    const prefix = prefixMap[type];
    let newLine: string;
    if (line.startsWith(prefix)) {
      newLine = line.slice(prefix.length);
    } else {
      let stripped = line;
      for (const p of Object.values(prefixMap)) {
        if (stripped.startsWith(p)) { stripped = stripped.slice(p.length); break; }
      }
      newLine = prefix + stripped;
    }
    const newText = text.substring(0, lineStart) + newLine + text.substring(lineEnd);
    this.bodyText.set(newText);
    const offset = newLine.length - line.length;
    setTimeout(() => {
      textarea.setSelectionRange(start + offset, end + offset);
      textarea.focus();
    });
  }

  toggleTech(id: string): void {
    const ids = this.selectedTechIds();
    this.selectedTechIds.set(ids.includes(id) ? ids.filter(i => i !== id) : [...ids, id]);
  }

  toggleCompany(id: string): void {
    const ids = this.selectedCompanyIds();
    this.selectedCompanyIds.set(ids.includes(id) ? ids.filter(i => i !== id) : [...ids, id]);
  }

  toggleTag(id: string): void {
    const ids = this.selectedTagIds();
    this.selectedTagIds.set(ids.includes(id) ? ids.filter(i => i !== id) : [...ids, id]);
  }

  async save(): Promise<void> {
    const blocks = this.parseTextToBlocks(this.bodyText());
    if (!this.title().trim() || blocks.length === 0) {
      this.toast.error('Title and body are required.');
      return;
    }

    this.saving.set(true);
    const data: ContentFormData = {
      title: this.title(),
      body: JSON.stringify(blocks),
      contentType: this.contentType(),
      difficulty: this.difficulty() || null,
      codeSnippet: this.codeSnippet() || null,
      codeLanguage: this.codeLanguage() || null,
      technologyIds: this.selectedTechIds(),
      companyIds: this.selectedCompanyIds(),
      tagIds: this.selectedTagIds(),
    };

    try {
      if (this.editId()) {
        await this.contentService.updateContributorContent(this.editId()!, data);
        this.toast.success('Content updated.');
      } else {
        await this.contentService.createContributorContent(data);
        this.toast.success('Content created as draft.');
      }
      this.router.navigate(['/contributor/content']);
    } catch {
      this.toast.error('Failed to save content.');
    } finally {
      this.saving.set(false);
    }
  }
}
