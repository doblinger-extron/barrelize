import {logError, runGenerateCommand, runInitCommand} from '#lib';
import {cac} from 'cac';
import {existsSync} from 'node:fs';
import {resolve} from 'node:path';
import pkg from '../../package.json' with {type: 'json'};

export function cliInit(): void {
  const cli = cac(pkg.name);

  cli
    .command('[config path]', 'Generate barrel files')
    .option('-w, --watch', 'Watch for changes and regenerate barrel files automatically')
    .action(async (configPath: string, options: {watch: boolean}) => {
      const defaultConfigFile = existsSync(resolve('./.barrelize')) ? './.barrelize' : './.barrelize.json';

      await runGenerateCommand({configPath: configPath || defaultConfigFile, watch: !!options.watch}).catch(
        logError,
      );
    });

  cli
    .command('init [config path]', 'Create .barrelize.json config file if does not exist')
    .example('barrelize init')
    .example('barrelize init .barrelize.json')
    .example('barrelize init root/.barrelize.json')
    .action((path = '.barrelize.json') => runInitCommand(path).catch(logError));

  cli.help();
  cli.version(pkg.version);

  try {
    cli.parse();
  } catch (error) {
    logError(String(error));
  }
}
