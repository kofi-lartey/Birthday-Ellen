# Kilo Agent Configuration

## Command Execution

### Lint Command
```bash
npm run lint
```

### Build Command
```bash
npm run build
```

## Project Structure

- **Source**: `src/`
  - **Pages**: `src/pages/` - All page components
  - **Components**: `src/components/` - Reusable components
  - **Utils**: `src/utils/` - Utilities and helpers
  - **Hooks**: `src/hooks/` - Custom React hooks
  - **supabase.js**: Supabase client configuration

- **Database**: `multi_event_schema.sql` - Complete database schema

## Agent Instructions

### When Making Code Changes
1. Always run `npm run lint` after changes
2. Build project: `npm run build`
3. Test changes thoroughly

### Testing Workflow
1. Make code changes
2. Run lint: `npm run lint`
3. Run tests: `npm test`
4. Build: `npm run build`

### Code Review
Use `/local-review-uncommitted` for uncommitted changes or `/local-review` for committed changes.
