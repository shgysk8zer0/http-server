import { node } from '@shgysk8zer0/eslint-config';

export default node({ files: ['*.js', './api/*.js'], ignores: ['static/*.js', '**/*.min.js', '**/*.cjs', '**/*.mjs'] });
