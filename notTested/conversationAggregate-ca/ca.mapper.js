// noinspection JSUnresolvedVariable

import TimeIntervalManager from '../utils/timeIntervalManager.js';
import CustomError from '../utils/customErrors/CustomError.js';

export default class ConverAggreMapper {
   static #CLASS_NAME = 'ConverAggreMapper';
   static async map(payload) {
      this.#validatePayload(payload);

      const carryingMetricsData = await this.#extractCAData(payload);
      const flattenedMetricsData = carryingMetricsData.flat();

      if (flattenedMetricsData.length === 0) {
         throw new CustomError({
            message: 'Invalid payload: No Data After Extraction.',
            className: this.#CLASS_NAME,
            functionName: 'map',
         }).toObject();
      }

      const result = await Promise.all(flattenedMetricsData.map(this.#extractMetricStats));

      return result.flat(2);
   }

   static #validatePayload(payload) {
      if (!payload || payload.length === 0) {
         throw new CustomError({
            message: 'Invalid payload: Payload is empty.',
            className: this.#CLASS_NAME,
            functionName: '#validatePayload',
         }).toObject();
      }
   }

   static async #extractCAData(payload) {
      return Promise.all(
         payload.map(async (item) => {
            if (!item.group || !item.data || item.data.length === 0) {
               throw new CustomError({
                  message: 'Invalid payload: Missing "group" or "data" in payload.',
                  className: this.#CLASS_NAME,
                  functionName: '#extractCAData',
               }).toObject();
            }

            return Promise.all(
               item.data.map((entity) => {
                  const intervals = entity.interval.split('/');
                  return {
                     queueId: item.group.queueId,
                     mediaType: item.group.mediaType,
                     requestedRoutingSkillId: item.group.requestedRoutingSkillId,
                     wrapUpCode: item.group.wrapUpCode,
                     startTime: TimeIntervalManager.roundToSecond(intervals[0]),
                     endTime: intervals[1],
                     metrics: entity.metrics,
                  };
               }),
            );
         }),
      );
   }

   static async #extractMetricStats(converAggre) {
      return Promise.all(
         converAggre.metrics.map(async (metric) => {
            const statsKeys = Object.keys(metric.stats).filter((key) => key !== 'min' && key !== 'max');

            return Promise.all(
               statsKeys.map((statKey) => {
                  return {
                     queueId: converAggre.queueId,
                     mediaType: converAggre.mediaType,
                     requestedRoutingSkillId: converAggre.requestedRoutingSkillId,
                     wrapUpCode: converAggre.wrapUpCode,
                     startTime: converAggre.startTime,
                     endTime: converAggre.endTime,
                     metric: metric.metric,
                     stat: statKey,
                     value: metric.stats[statKey],
                  };
               }),
            );
         }),
      );
   }
}