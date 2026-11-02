import bcrypt from 'bcryptjs';
import prisma from '../config/prisma.js';
import { attachId, createQueryWrapper } from './modelUtils.js';

function toDateOrNull(val) {
    if (!val) return null;
    const d = new Date(val);
    return isNaN(d.getTime()) ? null : d;
}

class UserModelInstance {
    constructor(data = {}) {
        Object.assign(this, data);
        if (this.id && !this._id) {
            this._id = this.id;
        }
    }

    async matchPassword(enteredPassword) {
        if (!this.password) return false;
        return await bcrypt.compare(enteredPassword, this.password);
    }

    async save() {
        // If password is plain text (not starting with $2a$ or $2b$), hash it
        if (this.password && !this.password.startsWith('$2a$') && !this.password.startsWith('$2b$')) {
            const salt = await bcrypt.genSalt(10);
            this.password = await bcrypt.hash(this.password, salt);
        }

        const dataToSave = {
            name: this.name,
            email: this.email,
            password: this.password,
            googleId: this.googleId || null,
            role: this.role || 'customer',
            phone: this.phone || null,
            licenseUrl: this.licenseUrl || null,
            branchId: this.branchId || null,
            isVerified: this.isVerified ?? false,
            verificationToken: this.verificationToken || null,
            otp: this.otp || null,
            otpExpires: toDateOrNull(this.otpExpires),
            resetPasswordToken: this.resetPasswordToken || null,
            resetPasswordExpire: toDateOrNull(this.resetPasswordExpire),
        };

        if (this.id || this._id) {
            const id = (this.id || this._id).toString();
            const updated = await prisma.user.update({
                where: { id },
                data: dataToSave,
            });
            Object.assign(this, updated);
            this._id = this.id;
            return this;
        } else {
            const created = await prisma.user.create({
                data: dataToSave,
            });
            Object.assign(this, created);
            this._id = this.id;
            return this;
        }
    }

    async deleteOne() {
        const id = this.id || this._id;
        if (id) {
            await prisma.user.delete({ where: { id: id.toString() } });
        }
    }
}

const User = function(data) {
    return new UserModelInstance(data);
};

User.create = async function(data) {
    const instance = new UserModelInstance(data);
    return await instance.save();
};

User.findOne = async function(filter = {}) {
    let where = {};
    if (filter.email) where.email = filter.email;
    if (filter.googleId) where.googleId = filter.googleId;
    if (filter.id || filter._id) where.id = (filter.id || filter._id).toString();

    const user = await prisma.user.findFirst({ where });
    if (!user) return null;
    return new UserModelInstance(user);
};

User.findById = function(id) {
    return createQueryWrapper(async ({ selectVal }) => {
        if (!id) return null;
        const user = await prisma.user.findUnique({
            where: { id: id.toString() }
        });
        if (!user) return null;
        if (selectVal && selectVal.includes('-password')) {
            delete user.password;
        }
        return new UserModelInstance(user);
    });
};

User.find = function(filter = {}) {
    return createQueryWrapper(async () => {
        const users = await prisma.user.findMany();
        return users.map(u => new UserModelInstance(u));
    });
};

User.deleteMany = async function() {
    return await prisma.user.deleteMany({});
};

export default User;
