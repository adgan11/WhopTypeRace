# Whop Next.js App Template Documentation

This directory contains the documentation for the Whop Next.js App Template, built with [Mintlify](https://mintlify.com/).

## Development

To run the documentation locally:

```bash
cd docs
mintlify dev
```

The documentation will be available at `http://localhost:3000`.

## Structure

```
docs/
├── mint.json              # Mintlify configuration
├── introduction.mdx       # Main introduction page
├── quickstart.mdx        # Quick start guide
├── installation.mdx      # Installation instructions
├── development/          # Development guides
│   ├── setup.mdx        # Development setup
│   ├── authentication.mdx
│   ├── database.mdx
│   └── deployment.mdx
├── components/          # Component documentation
├── api-reference/       # API documentation
├── images/             # Image assets
├── snippets/           # Reusable code snippets
└── logo/               # Logo assets
```

## Adding New Pages

1. Create a new `.mdx` file in the appropriate directory
2. Add frontmatter with title and description:
   ```yaml
   ---
   title: 'Page Title'
   description: 'Page description'
   ---
   ```
3. Update `mint.json` to include the new page in the navigation
4. Add the page to the appropriate navigation group

## Deployment

The documentation can be deployed to:

- **Mintlify**: Connect your GitHub repository to Mintlify for automatic deployments
- **Vercel**: Deploy as a static site
- **Netlify**: Deploy as a static site
- **GitHub Pages**: Use GitHub Actions to build and deploy

### Mintlify Deployment

1. Go to [mintlify.com](https://mintlify.com)
2. Connect your GitHub repository
3. Set the docs directory as the source
4. Deploy automatically on every push

## Writing Guidelines

- Use clear, concise language
- Include code examples for all features
- Use Mintlify components like `<Card>`, `<CardGroup>`, `<Tabs>`, etc.
- Keep navigation structure logical and intuitive
- Update the configuration in `mint.json` when adding new sections

## Mintlify Components

Available components for enhanced documentation:

- `<Card>` - Feature cards with icons and links
- `<CardGroup>` - Group cards in a grid layout
- `<Tabs>` - Tabbed content sections
- `<Steps>` - Step-by-step guides
- `<Accordion>` - Collapsible content sections
- `<Note>`, `<Tip>`, `<Warning>` - Callout boxes
- `<CodeGroup>` - Multiple code examples

## Maintenance

- Keep all code examples up to date with the latest template version
- Regularly check and update external links
- Update screenshots and images when UI changes
- Review and update API documentation when the Whop SDK changes

For more information about Mintlify, visit their [documentation](https://mintlify.com/docs). 