# GitHub Pages Deploy Fix v1.3

## Root cause

The previous ZIP/package-lock was generated in an environment that wrote internal package registry URLs into `package-lock.json`.
On GitHub Actions, this can break or partially break dependency installation. When React type packages are not installed correctly, TypeScript then reports errors such as:

- `JSX element implicitly has type 'any' because no interface 'JSX.IntrinsicElements' exists`
- `Parameter 'prev' implicitly has an 'any' type`

These are dependency/type-resolution symptoms, not real JSX syntax failures.

## Fix applied

The GitHub Pages workflow now removes any existing lock file on the runner and installs dependencies from the public npm registry:

```yaml
rm -f package-lock.json
npm install --registry=https://registry.npmjs.org/
```

The build command is explicit:

```bash
tsc --noEmit && vite build
```

## Important when pushing

If the repository already contains the old `package-lock.json`, either delete it from GitHub or keep the v1.3 workflow. The workflow removes it before install, so deployment no longer depends on the poisoned lock file.
