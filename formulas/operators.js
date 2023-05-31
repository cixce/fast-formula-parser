const FormulaError = require('../formulas/error');
const {Types, FormulaHelpers} = require('../formulas/helpers');

const Prefix = {
    unaryOp: (prefixes, value, isArray) => {
        let sign = 1;
        prefixes.forEach(prefix => {
            if (prefix === '+') {
            } else if (prefix === '-') {
                sign = -sign;
            } else {
                throw new Error(`Unrecognized prefix: ${prefix}`);
            }
        });

        if (value == null) {
            value = 0;
        }
        // positive means no changes
        if (sign === 1) {
            return value;
        }
        // negative
        try {
            value = FormulaHelpers.acceptNumber(value, isArray);
        } catch (e) {
            if (e instanceof FormulaError) {
                // parse number fails
                if (Array.isArray(value))
                    value = value[0][0]
            } else
                throw e;
        }

        if (typeof value === "number" && isNaN(value)) return FormulaError.VALUE;
        return -value;
    }
};

const Postfix = {
    percentOp: (value, postfix, isArray) => {
        try {
            value = FormulaHelpers.acceptNumber(value, isArray);
        } catch (e) {
            if (e instanceof FormulaError)
                return e;
            throw e;
        }
        if (postfix === '%') {
            return value / 100;
        }
        throw new Error(`Unrecognized postfix: ${postfix}`);
    }
};

const type2Number = {'boolean': 3, 'string': 2, 'number': 1};

const Infix = {
    compareOp: (value1, infix, value2, isArray1, isArray2) => {
        if (value1 == null) value1 = 0;
        if (value2 == null) value2 = 0;
        // for array: {1,2,3}, get the first element to compare
        if (isArray1) {
            value1 = value1[0][0];
        }
        if (isArray2) {
            value2 = value2[0][0];
        }

        const type1 = typeof value1, type2 = typeof value2;

        if (type1 === type2) {
            // same type comparison
            switch (infix) {
                case '=':
                    return value1 === value2;
                case '>':
                    return value1 > value2;
                case '<':
                    return value1 < value2;
                case '<>':
                    return value1 !== value2;
                case '<=':
                    return value1 <= value2;
                case '>=':
                    return value1 >= value2;
            }
        } else {
            switch (infix) {
                case '=':
                    return false;
                case '>':
                    return type2Number[type1] > type2Number[type2];
                case '<':
                    return type2Number[type1] < type2Number[type2];
                case '<>':
                    return true;
                case '<=':
                    return type2Number[type1] <= type2Number[type2];
                case '>=':
                    return type2Number[type1] >= type2Number[type2];
            }

        }
        throw Error('Infix.compareOp: Should not reach here.');
    },

    concatOp: (value1, infix, value2, isArray1, isArray2) => {
        if (value1 == null) value1 = '';
        if (value2 == null) value2 = '';
        // for array: {1,2,3}, get the first element to concat
        if (isArray1) {
            value1 = value1[0][0];
        }
        if (isArray2) {
            value2 = value2[0][0];
        }

        const type1 = typeof value1, type2 = typeof value2;
        // convert boolean to string
        if (type1 === 'boolean')
            value1 = value1 ? 'TRUE' : 'FALSE';
        if (type2 === 'boolean')
            value2 = value2 ? 'TRUE' : 'FALSE';
        return '' + value1 + value2;
    },

    mathOp: (value1, infix, value2, isArray1, isArray2) => {
      if (value1 == null) value1 = 0;
      if (value2 == null) value2 = 0;
      
      const infixOp = (value1, infix, value2) => {
        switch (infix) {
            case '+':
                return value1 + value2;
            case '-':
                return value1 - value2;
            case '*':
                return value1 * value2;
            case '/':
                if (value2 === 0)
                    return FormulaError.DIV0;
                return value1 / value2;
            case '^':
                return value1 ** value2;
        }

        throw Error('Infix.mathOp: Should not reach here.');
      }

      if(isArray1 || Array.isArray(value1)) {
          value1 = FormulaHelpers.accept(value1, Types.ARRAY, undefined, false, true);
          if(isArray2 || Array.isArray(value2)) {
            value2 = FormulaHelpers.accept(value, Types.ARRAY, undefined, false, true);
            if (value1[0].length !== value2[0].length || value1.length !== value2.length)
                throw FormulaError.VALUE;
            for (let i = 0; i < value1.length; i++) {
                for (let j = 0; j < value1[0].length; j++) {
                    if (typeof value1[i][j] !== "number")
                        value1[i][j] = 0;
                    if (typeof value2[i][j] !== "number")
                        value2[i][j] = 0;
                    value1[i][j]=infixOp(value1[i][j], value2[i][j]);
                }
            }
          } else {
            value2 = FormulaHelpers.acceptNumber(value2, isArray2);
            for (let i = 0; i < value1.length; i++) {
                for (let j = 0; j < value1[0].length; j++) {
                    if (typeof value1[i][j] !== "number")
                        value1[i][j] = 0;
                    value1[i][j]=infixOp(value1[i][j], infix, value2);
                }
            }
          }
        return value1;

        // FormulaHelpers.flattenParams(value1, Types.NUMBER, false, (i) => arr1.push(i));
        // if(isArray2 || Array.isArray(value2)) {
        //   if(value1.length != value2.length) {
        //     throw FormulaError.VALUE;
        //   }
        //   FormulaHelpers.flattenParams(value2, Types.NUMBER, false, (i) => arr2.push(i));
        // } else {
        //   value2 = FormulaHelpers.acceptNumber(value2, isArray2);
        //   arr2 = Array(value1.length).fill(value2);
        // }
        // return arr1.map((v, i) => infixOp(v, infix,  arr2[i]));
      }
        try {
            value1 = FormulaHelpers.acceptNumber(value1, isArray1);
            value2 = FormulaHelpers.acceptNumber(value2, isArray2);
        } catch (e) {
            if (e instanceof FormulaError)
                return e;
            throw e;
        }
      return infixOp(value1, infix, value2);
    },
};

module.exports = {
    Prefix,
    Postfix,
    Infix,
    Operators: {
        compareOp: ['<', '>', '=', '<>', '<=', '>='],
        concatOp: ['&'],
        mathOp: ['+', '-', '*', '/', '^'],
    }
};
