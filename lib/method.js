import { Meteor } from 'meteor/meteor';
import { MongoInternals } from 'meteor/mongo';
import { Offline } from './config';
import { offlineCollections } from './mongo';
import { isEmpty, needsReplace, deepReplace, PLACEHOLDER_USER_ID } from './utils/shared';
import { splitAllSettled } from './utils/server';

const formatResult = ({ name, removeIds = [] }) => ({ name, removeIds, syncedAt: new Date() });

// this function reconciles offline data with the server in case documents that no longer match a .keep filter need to be removed
Meteor.methods({
  '_keep': async function(syncs) {
    check(syncs, [{
      name: String,
      syncedAt: Date
    }]);

    const { userId } = this;
    const { name: archiveName, collectionKey, primaryIdKey, timestampKey } = Offline.config.archive || {};

    const offlineCollectionsToReconcile = [];
    for (const [name, { filter, sort }] of offlineCollections.entries()) {
      if ((archiveName && name !== archiveName) || !isEmpty(filter)) offlineCollectionsToReconcile.push({ name, filter, sort });
    }

    if (!syncs.length) {
      const synced = offlineCollectionsToReconcile.map(({ name }) => formatResult({ name }));
      return { synced, errors: [] };
    }

    const promises = offlineCollectionsToReconcile.map(async ({ name, filter, sort }) => {
      const { syncedAt } = syncs.find(s => s.name === name) || {};
      if (!syncedAt) {
        return formatResult({ name });
      }

      const idKey = primaryIdKey ?? '_id';
      const collectionName = archiveName ?? name;
      const sortKey = timestampKey ?? Object.keys(sort)[0];
      const replacedFilter = filter[needsReplace] ? deepReplace(filter, PLACEHOLDER_USER_ID, userId) : filter;
      const finalFilter = { $and: [{ [sortKey]: {$gt: syncedAt} }, ...(isEmpty(replacedFilter) ? [] : [{ $nor: [replacedFilter] }]), ...(collectionKey ? [{[collectionKey]: name}] : []) ]};
      const rawCollection = MongoInternals.defaultRemoteCollectionDriver().mongo.db.collection(collectionName);

      try {
        const removeIds = (await rawCollection.distinct(idKey, finalFilter)).map(String); // make sure _ids are strings, used to support Mongo.ObjectID
        return formatResult({ name, removeIds });
      } catch (error) {
        return { name, error };
      }
    });

    const { fulfilled, rejected } = splitAllSettled(await Promise.allSettled(promises));

    return { synced: fulfilled, errors: rejected };
  }
});
