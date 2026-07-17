# EURO AI Performance Baselines

**Generated**: 2026-07-17T13:25:22.871Z
**Environment**: Development
**Average Page Load**: 1000ms
**Estimated Lighthouse Score**: 80

## Page Load Times

| Page         | Load Time | Status        |
| ------------ | --------- | ------------- |
| /            | 1002ms    | ❌ Needs Work |
| /auth/signup | 1006ms    | ❌ Needs Work |
| /auth/signin | 961ms     | ⚠️ Good       |
| /workspace   | 1001ms    | ❌ Needs Work |
| /inventory   | 1007ms    | ❌ Needs Work |
| /assessment  | 1058ms    | ❌ Needs Work |
| /compliance  | 951ms     | ⚠️ Good       |
| /team        | 1016ms    | ❌ Needs Work |

## SLO Compliance

### Target Metrics

- Page Load Time: < 500ms (p95)
- First Contentful Paint: < 1800ms
- Largest Contentful Paint: < 2500ms

### Current Status

- Average Load Time: 1000ms
- All pages responsive: ✅ Yes

## Estimated Lighthouse Scores

- /: Performance 80
- /auth/signup: Performance 80
- /auth/signin: Performance 81
- /workspace: Performance 80
- /inventory: Performance 80
- /assessment: Performance 79
- /compliance: Performance 81
- /team: Performance 80

## Recommendations

### Quick Wins

1. Code splitting for large routes
2. Image optimization and lazy loading
3. Remove unused CSS/JavaScript
4. Enable compression (gzip/brotli)
5. Implement caching headers

### Measurement Details

[
{
"url": "/",
"statusCode": 200,
"loadTime": 1002,
"domContentLoaded": 92,
"loadComplete": 431,
"timestamp": "2026-07-17T13:25:15.147Z",
"estimate": {
"lighthouse_performance": 80,
"accessibility": 90,
"best_practices": 85,
"seo": 90
}
},
{
"url": "/auth/signup",
"statusCode": 200,
"loadTime": 1006,
"domContentLoaded": 83,
"loadComplete": 443,
"timestamp": "2026-07-17T13:25:16.251Z",
"estimate": {
"lighthouse_performance": 80,
"accessibility": 90,
"best_practices": 85,
"seo": 90
}
},
{
"url": "/auth/signin",
"statusCode": 200,
"loadTime": 961,
"domContentLoaded": 93,
"loadComplete": 402,
"timestamp": "2026-07-17T13:25:17.311Z",
"estimate": {
"lighthouse_performance": 81,
"accessibility": 90,
"best_practices": 85,
"seo": 90
}
},
{
"url": "/workspace",
"statusCode": 200,
"loadTime": 1001,
"domContentLoaded": 115,
"loadComplete": 423,
"timestamp": "2026-07-17T13:25:18.410Z",
"estimate": {
"lighthouse_performance": 80,
"accessibility": 90,
"best_practices": 85,
"seo": 90
}
},
{
"url": "/inventory",
"statusCode": 200,
"loadTime": 1007,
"domContentLoaded": 272,
"loadComplete": 433,
"timestamp": "2026-07-17T13:25:19.505Z",
"estimate": {
"lighthouse_performance": 80,
"accessibility": 90,
"best_practices": 85,
"seo": 90
}
},
{
"url": "/assessment",
"statusCode": 200,
"loadTime": 1058,
"domContentLoaded": 117,
"loadComplete": 501,
"timestamp": "2026-07-17T13:25:20.647Z",
"estimate": {
"lighthouse_performance": 79,
"accessibility": 90,
"best_practices": 85,
"seo": 90
}
},
{
"url": "/compliance",
"statusCode": 200,
"loadTime": 951,
"domContentLoaded": 84,
"loadComplete": 396,
"timestamp": "2026-07-17T13:25:21.680Z",
"estimate": {
"lighthouse_performance": 81,
"accessibility": 90,
"best_practices": 85,
"seo": 90
}
},
{
"url": "/team",
"statusCode": 200,
"loadTime": 1016,
"domContentLoaded": 83,
"loadComplete": 454,
"timestamp": "2026-07-17T13:25:22.780Z",
"estimate": {
"lighthouse_performance": 80,
"accessibility": 90,
"best_practices": 85,
"seo": 90
}
}
]
