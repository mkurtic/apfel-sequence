import type { AssetConfig } from '../../types/apfelSequence';
import { getFrameHref } from './getFrameHref';

const resolveFallbackFrameUrl = (cfg: AssetConfig): string => {
	if (typeof cfg.frameFallback === 'string') {
		return cfg.frameFallback;
	}

	if (typeof cfg.frameFallback === 'number') {
		return getFrameHref(
			{
				...cfg,
				frameDigits: cfg.frameDigits ?? 4,
				framePrefix: cfg.framePrefix ?? '',
				frameSuffix: cfg.frameSuffix ?? ''
			},
			cfg.frameFallback
		);
	}

	const first = cfg.frameFirstId ?? 1;

	return getFrameHref(
		{
			...cfg,
			frameDigits: cfg.frameDigits ?? 4,
			framePrefix: cfg.framePrefix ?? '',
			frameSuffix: cfg.frameSuffix ?? ''
		},
		first
	);
};

export default resolveFallbackFrameUrl;
