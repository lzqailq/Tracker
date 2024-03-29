import {
  onFCP,
  onCLS,
  onLCP,
  onFID,
  type FCPMetric,
  type LCPMetric,
  type FIDMetric,
  type CLSMetric,
} from 'web-vitals';

import { MetricData } from '../types/performance';
export function WebVitals() {
    console.log("sssssssssssssssssssss")
    console.log(onCLS)
  let data: MetricData;

  onCLS((metricData: CLSMetric) => {
    data.CLS = {
      name: metricData.name,
      value: metricData.value,
      rating: metricData.rating,
    };
    console.log(metricData);
  })
  onFCP((metricData: FCPMetric) => {
    data.FCP = {
      name: metricData.name,
      value: metricData.value,
      rating: metricData.rating,
    };
    console.log(metricData);
  })
  onLCP((metricData: LCPMetric) => {
    data.LCP = {
      name: metricData.name,
      value: metricData.value,
      rating: metricData.rating,
    };
    console.log(metricData);
  });
  onFID((metricData: FIDMetric) => {
    data.FID = {
      name: metricData.name,
      value: metricData.value,
      rating: metricData.rating,
    };
    console.log(metricData);
  });
  return data;
}
