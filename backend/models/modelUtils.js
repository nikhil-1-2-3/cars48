/**
 * Utility functions for Prisma-backed model compatibility
 */

export function normalizeSort(sortVal) {
    if (!sortVal) return { createdAt: 'desc' };
    if (typeof sortVal === 'string') {
        const desc = sortVal.startsWith('-');
        const field = desc ? sortVal.substring(1) : sortVal;
        return { [field]: desc ? 'desc' : 'asc' };
    }
    if (typeof sortVal === 'object') {
        const result = {};
        for (const [k, v] of Object.entries(sortVal)) {
            if (v === -1 || v === '-1' || v === 'desc') {
                result[k] = 'desc';
            } else if (v === 1 || v === '1' || v === 'asc') {
                result[k] = 'asc';
            } else {
                result[k] = v;
            }
        }
        return result;
    }
    return sortVal;
}

export function attachId(obj) {
    if (!obj || typeof obj !== 'object') return obj;
    if (obj.id && !obj._id) {
        obj._id = obj.id;
    }
    // Also recursively attach _id for nested relation objects
    for (const key of Object.keys(obj)) {
        if (obj[key] && typeof obj[key] === 'object' && obj[key].id && !obj[key]._id) {
            obj[key]._id = obj[key].id;
        }
    }
    return obj;
}

export function createQueryWrapper(fetchFn) {
    let populateOpts = [];
    let limitVal = null;
    let skipVal = null;
    let sortVal = null;
    let selectVal = null;
    let isLean = false;

    const wrapper = {
        populate(pathOrObj, select) {
            if (typeof pathOrObj === 'string') {
                populateOpts.push({ path: pathOrObj, select });
            } else if (typeof pathOrObj === 'object') {
                populateOpts.push(pathOrObj);
            }
            return wrapper;
        },
        limit(n) {
            limitVal = n;
            return wrapper;
        },
        skip(n) {
            skipVal = n;
            return wrapper;
        },
        sort(s) {
            sortVal = s;
            return wrapper;
        },
        select(fields) {
            selectVal = fields;
            return wrapper;
        },
        lean() {
            isLean = true;
            return wrapper;
        },
        async then(resolve, reject) {
            try {
                const res = await fetchFn({ populateOpts, limitVal, skipVal, sortVal, selectVal, isLean });
                resolve(res);
            } catch (err) {
                reject(err);
            }
        },
        catch(reject) {
            return wrapper.then(x => x, reject);
        }
    };

    return wrapper;
}
